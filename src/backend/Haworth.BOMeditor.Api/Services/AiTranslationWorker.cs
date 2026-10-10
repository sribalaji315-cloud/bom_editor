using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

/// <summary>
/// Drains the translation queue one job at a time. Each job gets its own DI scope because the AI and
/// data services are scoped and there is no request to borrow one from.
/// </summary>
public class AiTranslationWorker(
    AiTranslationQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<AiTranslationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var jobId in queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await RunJobAsync(jobId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "AI translation job {JobId} failed.", jobId);
            }
        }
    }

    private async Task RunJobAsync(Guid jobId, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var translation = scope.ServiceProvider.GetRequiredService<IAiTranslationService>();

        var job = await db.AiTranslationJobs.Include(j => j.Items).FirstOrDefaultAsync(j => j.Id == jobId, ct);
        if (job is null || job.Status != AiJobStatus.Queued) return;

        job.Status = AiJobStatus.Running;
        job.StartedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        try
        {
            var runner = await translation.CreateRunnerAsync(job.Context, ct);
            job.Provider = runner.Provider;
            job.Model = runner.Model;

            foreach (var item in job.Items.OrderBy(i => i.Id))
            {
                if (ct.IsCancellationRequested) break;
                // Cancellation is a status change made by another scope, so read it fresh each item.
                if (await CurrentStatusAsync(db, jobId, ct) == AiJobStatus.Cancelled) return;

                try
                {
                    item.Expression = await runner.TranslateAsync(item.FieldType, item.SourceText, ct);
                    item.Error = null;
                    job.CompletedItems++;
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    item.Error = ex.Message;
                    job.FailedItems++;
                    logger.LogWarning(ex, "AI translation item {ItemId} failed.", item.Id);
                }

                await db.SaveChangesAsync(ct);
            }

            if (await CurrentStatusAsync(db, jobId, ct) == AiJobStatus.Cancelled) return;
            job.Status = AiJobStatus.Completed;
        }
        catch (Exception ex)
        {
            job.Status = AiJobStatus.Failed;
            job.Error = ex.Message;
            logger.LogError(ex, "AI translation job {JobId} failed.", jobId);
        }

        job.CompletedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(CancellationToken.None);
    }

    private static async Task<AiJobStatus> CurrentStatusAsync(AppDbContext db, Guid jobId, CancellationToken ct) =>
        await db.AiTranslationJobs.AsNoTracking()
            .Where(j => j.Id == jobId)
            .Select(j => j.Status)
            .FirstAsync(ct);
}
