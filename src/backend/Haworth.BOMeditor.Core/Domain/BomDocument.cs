namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// A BOM document; the root aggregate that owns a tree of <see cref="BomLine"/>.
/// Each CSV import creates one document.
/// </summary>
public class BomDocument
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SourceFileName { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<BomLine> Lines { get; set; } = new List<BomLine>();
}
