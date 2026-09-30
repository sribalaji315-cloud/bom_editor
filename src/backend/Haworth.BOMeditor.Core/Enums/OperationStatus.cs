namespace Haworth.BOMeditor.Core.Enums;

/// <summary>Review state of an operation definition.</summary>
public enum OperationStatus
{
    /// <summary>Submitted by a user; not selectable until a Data Specialist approves it.</summary>
    Requested,
    Approved,
    Rejected
}
