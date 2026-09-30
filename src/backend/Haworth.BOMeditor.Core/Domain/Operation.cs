using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// A master-data operation definition. Route operations store the <see cref="Code"/> as a plain string,
/// so the ROUTE TEMPLATE CSV round-trips unchanged.
/// </summary>
public class Operation
{
    public Guid Id { get; set; }

    /// <summary>The value a route operation stores in its Operation ID field; unique.</summary>
    public string Code { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public OperationStatus Status { get; set; } = OperationStatus.Approved;

    /// <summary>When false the operation is hidden from the route operation picker.</summary>
    public bool IsActive { get; set; } = true;

    public string? RequestReason { get; set; }
    public string? RequestedBy { get; set; }
    public DateTimeOffset? RequestedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
