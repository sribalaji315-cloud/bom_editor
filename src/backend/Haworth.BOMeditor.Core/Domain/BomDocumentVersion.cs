using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// An immutable snapshot of a document's lines, taken manually or automatically when the document
/// is approved or released. Lines are stored as JSON so the tree needs no second set of tables.
/// </summary>
public class BomDocumentVersion
{
    public Guid Id { get; set; }
    public Guid BomDocumentId { get; set; }

    /// <summary>Sequential per document, starting at 1.</summary>
    public int VersionNumber { get; set; }

    public string? Label { get; set; }
    public BomDocumentStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public int LineCount { get; set; }
    public string SnapshotJson { get; set; } = string.Empty;
}
