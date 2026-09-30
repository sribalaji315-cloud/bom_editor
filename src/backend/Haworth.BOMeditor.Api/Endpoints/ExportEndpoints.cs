using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class ExportEndpoints
{
    public static IEndpointRouteBuilder MapExportEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/boms/{id:guid}/export", async (
            Guid id, ICsvExportService export, IBomValidationService validation, CancellationToken ct) =>
        {
            var report = await validation.ValidateAsync(id, ct);
            if (report is null) return Results.NotFound();
            // A BOM with outstanding errors must not reach PLM; the report tells the user what to fix.
            if (report.ErrorCount > 0) return Results.Json(report, statusCode: StatusCodes.Status409Conflict);

            var bytes = await export.ExportAsync(id, ct);
            return bytes is null
                ? Results.NotFound()
                : Results.File(bytes, "text/csv", $"bom-{id}.csv");
        }).RequireAuthorization();

        return app;
    }
}
