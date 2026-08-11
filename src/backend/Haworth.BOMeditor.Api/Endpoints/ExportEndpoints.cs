using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class ExportEndpoints
{
    public static IEndpointRouteBuilder MapExportEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/boms/{id:guid}/export", async (
            Guid id, ICsvExportService export, CancellationToken ct) =>
        {
            var bytes = await export.ExportAsync(id, ct);
            return bytes is null
                ? Results.NotFound()
                : Results.File(bytes, "text/csv", $"bom-{id}.csv");
        }).RequireAuthorization();

        return app;
    }
}
