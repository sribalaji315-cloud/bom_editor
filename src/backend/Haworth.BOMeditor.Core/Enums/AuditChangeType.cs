namespace Haworth.BOMeditor.Core.Enums;

/// <summary>
/// Type of change recorded in the BOM audit log.
/// </summary>
public enum AuditChangeType
{
    Create,
    Update,
    Delete,
    Move,
    Restore,
    Status
}
