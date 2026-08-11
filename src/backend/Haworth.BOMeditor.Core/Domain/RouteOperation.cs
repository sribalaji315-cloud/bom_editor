namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// A single operation within a <see cref="Route"/>. Operations are a flat, ordered list
/// (<see cref="SortOrder"/>); sequencing is also expressed in the source via NextOperation.
/// Numeric-looking fields are stored as strings so the source CSV round-trips verbatim.
/// </summary>
public class RouteOperation
{
    public Guid Id { get; set; }

    public Guid RouteId { get; set; }
    public Route Route { get; set; } = null!;

    /// <summary>Order among operations in the route.</summary>
    public int SortOrder { get; set; }

    public string? OperationNo { get; set; }
    public string? OperationId { get; set; }
    public string? Description { get; set; }
    public string? DescriptionLen { get; set; }
    public string? NextOperation { get; set; }
    public string? SwingWc { get; set; }
    public string? RuntimeType { get; set; }
    public string? SetUpTime { get; set; }
    public string? Time { get; set; }
    public string? ResourceId { get; set; }
    public string? ResourceGroup { get; set; }
    public string? RouteGroupId { get; set; }
    public string? Priority { get; set; }
    public string? Condition { get; set; }
    public string? Formula { get; set; }
}
