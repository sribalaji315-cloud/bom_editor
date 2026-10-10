using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>Queued bulk translation runs: create, poll, cancel, and apply the accepted suggestions.</summary>
public interface IAiTranslationJobService
{
    Task<AiTranslationJobDto> CreateAsync(
        CreateTranslationJobRequest request, UserContext user, CancellationToken ct = default);
    Task<AiTranslationJobDto?> GetAsync(Guid jobId, CancellationToken ct = default);
    /// <summary>Most recent job for a BOM document or route, so the editor can show live progress.</summary>
    Task<AiTranslationJobDto?> GetLatestForTargetAsync(Guid targetId, CancellationToken ct = default);
    Task<bool> CancelAsync(Guid jobId, CancellationToken ct = default);
    Task<ApplyTranslationJobResult?> ApplyAsync(
        Guid jobId, ApplyTranslationJobRequest request, UserContext user, CancellationToken ct = default);
}
