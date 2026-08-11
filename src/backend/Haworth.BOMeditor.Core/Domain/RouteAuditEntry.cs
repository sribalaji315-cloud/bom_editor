using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// Immutable audit record of a change to a route or one of its operations.
/// </summary>
public class RouteAuditEntry
{
    public Guid Id { get; set; }
    public Guid RouteId { get; set; }
    public Guid? RouteOperationId { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public AuditChangeType ChangeType { get; set; }
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}
