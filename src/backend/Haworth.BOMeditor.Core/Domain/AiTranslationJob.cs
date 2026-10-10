using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// A queued bulk translation run over one BOM document or route. The worker fills in the item
/// results; a user reviews them and applies the ones they want.
/// </summary>
public class AiTranslationJob
{
    public Guid Id { get; set; }
    public AiContext Context { get; set; }
    /// <summary>BOM document id or route id, depending on <see cref="Context"/>.</summary>
    public Guid TargetId { get; set; }
    public AiJobStatus Status { get; set; }
    public AiProvider? Provider { get; set; }
    public string? Model { get; set; }
    /// <summary>Captured at creation: the worker has no HttpContext but audit entries need a user.</summary>
    public string? RequestedByUserId { get; set; }
    public string? RequestedByUserName { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int TotalItems { get; set; }
    public int CompletedItems { get; set; }
    public int FailedItems { get; set; }
    public string? Error { get; set; }
    public List<AiTranslationJobItem> Items { get; set; } = [];
}
