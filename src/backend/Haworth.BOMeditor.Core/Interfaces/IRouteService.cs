using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>
/// Owns validation, persistence orchestration, and audit logging for routes and their operations.
/// </summary>
public interface IRouteService
{
    Task<IReadOnlyList<RouteSummaryDto>> GetRoutesAsync(CancellationToken ct = default);
    Task<RouteDetailDto?> GetRouteAsync(Guid routeId, CancellationToken ct = default);
    /// <summary>Active route codes for the BOM line route picker.</summary>
    Task<IReadOnlyList<string>> GetActiveCodesAsync(CancellationToken ct = default);
    Task<RouteDetailDto> CreateRouteAsync(CreateRouteRequest request, UserContext user, CancellationToken ct = default);
    Task<RouteDetailDto?> UpdateRouteAsync(Guid routeId, UpdateRouteRequest request, UserContext user, CancellationToken ct = default);
    Task<bool> DeleteRouteAsync(Guid routeId, UserContext user, CancellationToken ct = default);
    Task<RouteOperationDto> CreateOperationAsync(Guid routeId, CreateRouteOperationRequest request, UserContext user, CancellationToken ct = default);
    Task<RouteOperationDto?> UpdateOperationAsync(Guid routeId, Guid operationId, UpdateRouteOperationRequest request, UserContext user, CancellationToken ct = default);
    Task<bool> DeleteOperationAsync(Guid routeId, Guid operationId, UserContext user, CancellationToken ct = default);
    Task<bool> MoveOperationAsync(Guid routeId, Guid operationId, MoveRouteOperationRequest request, UserContext user, CancellationToken ct = default);
    Task<IReadOnlyList<RouteAuditEntryDto>> GetAuditAsync(Guid routeId, CancellationToken ct = default);
    Task<byte[]?> ExportAsync(Guid routeId, CancellationToken ct = default);
}
