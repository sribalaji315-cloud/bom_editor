namespace Haworth.BOMeditor.Core.Domain;

/// <summary>One cell in a translation job: the source text and, once translated, the suggestion.</summary>
public class AiTranslationJobItem
{
    public Guid Id { get; set; }
    public Guid JobId { get; set; }
    public AiTranslationJob? Job { get; set; }
    /// <summary>BOM line id or route operation id the cell belongs to.</summary>
    public Guid TargetLineId { get; set; }
    /// <summary>"condition" or "formula".</summary>
    public string FieldType { get; set; } = string.Empty;
    public string SourceText { get; set; } = string.Empty;
    public string? Expression { get; set; }
    public string? Error { get; set; }
    public DateTimeOffset? AppliedAt { get; set; }
}
