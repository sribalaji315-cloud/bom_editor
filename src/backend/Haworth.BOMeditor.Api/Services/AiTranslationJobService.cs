using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Exceptions;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

/// <summary>
/// Owns the lifecycle of queued bulk translation runs. The LLM work itself happens in
/// <see cref="AiTranslationWorker"/>; applying results goes through the BOM/route services so the
/// editable-status check and audit trail still apply.
/// </summary>
public class AiTranslationJobService(
    AppDbContext db,
    AiTranslationQueue queue,
    IBomService bomService,
    IRouteService routeService) : IAiTranslationJobService
{
    /// <summary>Upper bound on one run so a single request cannot queue an unbounded number of LLM calls.</summary>
    private const int MaxItems = 500;

    public async Task<AiTranslationJobDto> CreateAsync(
        CreateTranslationJobRequest request, UserContext user, CancellationToken ct = default)
    {
        var items = request.Items?.Where(i => !string.IsNullOrWhiteSpace(i.NaturalLanguage)).ToList() ?? [];
        if (items.Count == 0)
            throw new InvalidOperationException("No cells with text to translate.");
        if (items.Count > MaxItems)
            throw new InvalidOperationException($"At most {MaxItems} cells can be translated in one run.");

        await EnsureTargetAcceptsTranslationsAsync(request.Context, request.TargetId, ct);

        var active = await db.AiTranslationJobs.AnyAsync(
            j => j.TargetId == request.TargetId
                && (j.Status == AiJobStatus.Queued || j.Status == AiJobStatus.Running), ct);
        if (active)
            throw new BomWorkflowException("A translation run is already queued for this document.");

        var job = new AiTranslationJob
        {
            Id = Guid.NewGuid(),
            Context = request.Context,
            TargetId = request.TargetId,
            Status = AiJobStatus.Queued,
            RequestedByUserId = user.UserId,
            RequestedByUserName = user.UserName,
            CreatedAt = DateTimeOffset.UtcNow,
            TotalItems = items.Count,
            Items = items.Select(i => new AiTranslationJobItem
            {
                Id = Guid.NewGuid(),
                TargetLineId = i.LineId,
                FieldType = string.Equals(i.FieldType, "formula", StringComparison.OrdinalIgnoreCase) ? "formula" : "condition",
                SourceText = i.NaturalLanguage.Trim()
            }).ToList()
        };

        db.AiTranslationJobs.Add(job);
        await db.SaveChangesAsync(ct);
        queue.Enqueue(job.Id);

        return await ToDtoAsync(job, ct);
    }

    public async Task<AiTranslationJobDto?> GetAsync(Guid jobId, CancellationToken ct = default)
    {
        var job = await db.AiTranslationJobs.AsNoTracking()
            .Include(j => j.Items)
            .FirstOrDefaultAsync(j => j.Id == jobId, ct);
        return job is null ? null : await ToDtoAsync(job, ct);
    }

    public async Task<AiTranslationJobDto?> GetLatestForTargetAsync(Guid targetId, CancellationToken ct = default)
    {
        var job = await db.AiTranslationJobs.AsNoTracking()
            .Include(j => j.Items)
            .Where(j => j.TargetId == targetId)
            .OrderByDescending(j => j.CreatedAt)
            .FirstOrDefaultAsync(ct);
        return job is null ? null : await ToDtoAsync(job, ct);
    }

    public async Task<bool> CancelAsync(Guid jobId, CancellationToken ct = default)
    {
        var job = await db.AiTranslationJobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
        if (job is null) return false;
        if (job.Status is not (AiJobStatus.Queued or AiJobStatus.Running)) return false;

        // The worker re-reads this between items and stops; a queued job is skipped when dequeued.
        job.Status = AiJobStatus.Cancelled;
        job.CompletedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ApplyTranslationJobResult?> ApplyAsync(
        Guid jobId, ApplyTranslationJobRequest request, UserContext user, CancellationToken ct = default)
    {
        var job = await db.AiTranslationJobs.Include(j => j.Items).FirstOrDefaultAsync(j => j.Id == jobId, ct);
        if (job is null) return null;

        var wanted = request.ItemIds?.ToHashSet() ?? [];
        var selected = job.Items
            .Where(i => !string.IsNullOrWhiteSpace(i.Expression))
            .Where(i => wanted.Count == 0 || wanted.Contains(i.Id))
            .ToList();
        if (selected.Count == 0) return new ApplyTranslationJobResult(0, 0);

        var updates = selected
            .GroupBy(i => i.TargetLineId)
            .Select(g => new PlmExpressionUpdate(
                g.Key,
                g.FirstOrDefault(i => i.FieldType == "condition")?.Expression,
                g.FirstOrDefault(i => i.FieldType == "formula")?.Expression))
            .ToList();

        var applied = job.Context == AiContext.Bom
            ? await bomService.ApplyPlmExpressionsAsync(job.TargetId, updates, user, ct)
            : await routeService.ApplyPlmExpressionsAsync(job.TargetId, updates, user, ct);

        var now = DateTimeOffset.UtcNow;
        foreach (var item in selected) item.AppliedAt = now;
        await db.SaveChangesAsync(ct);

        return new ApplyTranslationJobResult(applied, updates.Count - applied);
    }

    private async Task EnsureTargetAcceptsTranslationsAsync(AiContext context, Guid targetId, CancellationToken ct)
    {
        if (context == AiContext.Bom)
        {
            var status = await db.BomDocuments
                .Where(d => d.Id == targetId)
                .Select(d => (BomDocumentStatus?)d.Status)
                .FirstOrDefaultAsync(ct)
                ?? throw new KeyNotFoundException("BOM document not found.");
            if (status != BomDocumentStatus.Draft)
                throw new BomWorkflowException($"This BOM is {status} and cannot be edited.");
        }
        else if (!await db.Routes.AnyAsync(r => r.Id == targetId, ct))
        {
            throw new KeyNotFoundException("Route not found.");
        }
    }

    /// <summary>Position is derived from the table, so the channel stays the only in-memory state.</summary>
    private async Task<int> QueuePositionAsync(AiTranslationJob job, CancellationToken ct)
    {
        if (job.Status != AiJobStatus.Queued) return 0;
        var ahead = await db.AiTranslationJobs.CountAsync(
            j => j.Status == AiJobStatus.Queued && j.CreatedAt < job.CreatedAt, ct);
        var running = await db.AiTranslationJobs.CountAsync(j => j.Status == AiJobStatus.Running, ct);
        return ahead + running;
    }

    private async Task<AiTranslationJobDto> ToDtoAsync(AiTranslationJob job, CancellationToken ct) =>
        new(job.Id, job.Context, job.TargetId, job.Status, job.Provider, job.Model,
            job.RequestedByUserName, job.CreatedAt, job.StartedAt, job.CompletedAt,
            job.TotalItems, job.CompletedItems, job.FailedItems,
            await QueuePositionAsync(job, ct), job.Error,
            job.Items
                .OrderBy(i => i.Id)
                .Select(i => new AiTranslationJobItemDto(
                    i.Id, i.TargetLineId, i.FieldType, i.SourceText, i.Expression, i.Error, i.AppliedAt))
                .ToList());
}
