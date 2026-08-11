namespace Haworth.BOMeditor.Core.Domain;

/// <summary>An admin-defined value selectable for a BOM line's Release Template field.</summary>
public class ReleaseTemplate
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
