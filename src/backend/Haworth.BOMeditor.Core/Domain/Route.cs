namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// A manufacturing route; the root aggregate that owns an ordered list of <see cref="RouteOperation"/>.
/// A BOM line links to a route by <see cref="Code"/> (e.g. "ROUTE2"). Numeric-looking header fields
/// are stored as strings so the source CSV round-trips verbatim.
/// </summary>
public class Route
{
    public Guid Id { get; set; }

    /// <summary>The join key a BOM line stores (e.g. "ROUTE2"); unique per route.</summary>
    public string Code { get; set; } = string.Empty;

    public string? RouteNumber { get; set; }
    public string? Name { get; set; }

    /// <summary>When false the route is hidden from the BOM line route picker.</summary>
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<RouteOperation> Operations { get; set; } = new List<RouteOperation>();
}
