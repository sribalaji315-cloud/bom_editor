using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// Immutable audit record of a change to a BOM document or line.
/// </summary>
public class BomAuditEntry
{
    public Guid Id { get; set; }
    public Guid BomDocumentId { get; set; }
    public Guid? BomLineId { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public AuditChangeType ChangeType { get; set; }
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}
