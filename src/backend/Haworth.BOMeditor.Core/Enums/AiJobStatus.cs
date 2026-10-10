namespace Haworth.BOMeditor.Core.Enums;

/// <summary>Lifecycle of a queued bulk AI translation run.</summary>
public enum AiJobStatus
{
    Queued,
    Running,
    Completed,
    Failed,
    Cancelled
}
