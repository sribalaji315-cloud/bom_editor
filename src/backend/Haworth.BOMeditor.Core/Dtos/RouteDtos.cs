using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Dtos;

/// <summary>Editable route header fields shared by create/update requests and read DTOs.</summary>
public record RouteHeaderFields
{
    public string Code { get; init; } = string.Empty;
    public string? RouteNumber { get; init; }
    public string? Name { get; init; }
    public bool IsActive { get; init; } = true;
}

/// <summary>Editable route operation fields shared by create/update requests and read DTOs.</summary>
public record RouteOperationFields
{
    public string? OperationNo { get; init; }
    public string? OperationId { get; init; }
    public string? Description { get; init; }
    public string? DescriptionLen { get; init; }
    public string? NextOperation { get; init; }
    public string? SwingWc { get; init; }
    public string? RuntimeType { get; init; }
    public string? SetUpTime { get; init; }
    public string? Time { get; init; }
    public string? ResourceId { get; init; }
    public string? ResourceGroup { get; init; }
    public string? RouteGroupId { get; init; }
    public string? Priority { get; init; }
    public string? Condition { get; init; }
    public string? Formula { get; init; }
}

public record RouteOperationDto : RouteOperationFields
{
    public Guid Id { get; init; }
    public int SortOrder { get; init; }
}

public record RouteSummaryDto(
    Guid Id,
    string Code,
    string? Name,
    string? RouteNumber,
    int OperationCount,
    bool IsActive,
    DateTimeOffset CreatedAt,
    string? CreatedBy,
    DateTimeOffset UpdatedAt);

public record RouteDetailDto : RouteHeaderFields
{
    public Guid Id { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public string? CreatedBy { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public IReadOnlyList<RouteOperationDto> Operations { get; init; } = [];
}

/// <summary>Create a new route header.</summary>
public record CreateRouteRequest : RouteHeaderFields;

/// <summary>Full replacement of a route's editable header fields.</summary>
public record UpdateRouteRequest : RouteHeaderFields;

/// <summary>Create a new operation at an optional position.</summary>
public record CreateRouteOperationRequest : RouteOperationFields
{
    public int? SortOrder { get; init; }
}

/// <summary>Full replacement of an operation's editable fields.</summary>
public record UpdateRouteOperationRequest : RouteOperationFields;

/// <summary>Reorder an operation within its route.</summary>
public record MoveRouteOperationRequest(int SortOrder);

public record RouteAuditEntryDto(
    Guid Id,
    Guid? RouteOperationId,
    DateTimeOffset Timestamp,
    string? UserName,
    AuditChangeType ChangeType,
    string? FieldName,
    string? OldValue,
    string? NewValue);

/// <summary>Outcome of a ROUTE TEMPLATE CSV import.</summary>
public record RouteImportResultDto(int Created, int Updated, int TotalOperations);
