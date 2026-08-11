using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>
/// Parses a ROUTE TEMPLATE CSV into routes and operations, upserting by route code.
/// </summary>
public interface IRouteImportService
{
    Task<RouteImportResultDto> ImportAsync(Stream csv, string fileName, UserContext user, CancellationToken ct = default);
}
