using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Dtos;

public record OperationDto(
    Guid Id,
    string Code,
    string Description,
    OperationStatus Status,
    bool IsActive,
    string? RequestReason,
    string? RequestedBy,
    DateTimeOffset? RequestedAt,
    string? ReviewedBy,
    DateTimeOffset? ReviewedAt);

/// <summary>The payload the route operation picker binds to.</summary>
public record OperationOptionDto(string Code, string Description);

/// <summary>Create an already-approved operation (editors only).</summary>
public record CreateOperationRequest(string Code, string Description);

public record UpdateOperationRequest(string Code, string Description, bool IsActive);

/// <summary>Submit a new operation for review; any authenticated user may do this.</summary>
public record RequestOperationRequest(string Code, string Description, string? Reason);

/// <summary>Approve a request, optionally correcting the submitted values.</summary>
public record ReviewOperationRequest(string? Code, string? Description);
