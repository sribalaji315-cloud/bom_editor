using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class RouteEndpoints
{
    public static IEndpointRouteBuilder MapRouteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/routes").RequireAuthorization();

        group.MapGet("/", async (IRouteService service, CancellationToken ct) =>
            Results.Ok(await service.GetRoutesAsync(ct)));

        group.MapGet("/codes", async (IRouteService service, CancellationToken ct) =>
            Results.Ok(await service.GetActiveCodesAsync(ct)));

        group.MapGet("/{id:guid}", async (Guid id, IRouteService service, CancellationToken ct) =>
        {
            var route = await service.GetRouteAsync(id, ct);
            return route is null ? Results.NotFound() : Results.Ok(route);
        });

        group.MapGet("/{id:guid}/audit", async (Guid id, IRouteService service, CancellationToken ct) =>
            Results.Ok(await service.GetAuditAsync(id, ct)));

        group.MapGet("/{id:guid}/export", async (Guid id, IRouteService service, CancellationToken ct) =>
        {
            var bytes = await service.ExportAsync(id, ct);
            return bytes is null ? Results.NotFound() : Results.File(bytes, "text/csv", $"route-{id}.csv");
        });

        group.MapPost("/import", async (
            HttpRequest http, IRouteImportService import, HttpContext ctx, CancellationToken ct) =>
        {
            if (!http.HasFormContentType)
                return Results.BadRequest("Expected multipart/form-data with a 'file' field.");

            var form = await http.ReadFormAsync(ct);
            var file = form.Files["file"];
            if (file is null || file.Length == 0)
                return Results.BadRequest("No CSV file was provided.");

            await using var stream = file.OpenReadStream();
            var result = await import.ImportAsync(stream, file.FileName, ctx.User.ToUserContext(), ct);
            return Results.Ok(result);
        }).RequireAuthorization(BomEndpoints.EditPolicy).DisableAntiforgery();

        group.MapPost("/", async (
            CreateRouteRequest request, IRouteService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                var created = await service.CreateRouteAsync(request, ctx.User.ToUserContext(), ct);
                return Results.Created($"/api/routes/{created.Id}", created);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapPut("/{id:guid}", async (
            Guid id, UpdateRouteRequest request, IRouteService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                var updated = await service.UpdateRouteAsync(id, request, ctx.User.ToUserContext(), ct);
                return updated is null ? Results.NotFound() : Results.Ok(updated);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapDelete("/{id:guid}", async (
            Guid id, IRouteService service, HttpContext ctx, CancellationToken ct) =>
        {
            var removed = await service.DeleteRouteAsync(id, ctx.User.ToUserContext(), ct);
            return removed ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapPost("/{id:guid}/operations", async (
            Guid id, CreateRouteOperationRequest request, IRouteService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                var created = await service.CreateOperationAsync(id, request, ctx.User.ToUserContext(), ct);
                return Results.Created($"/api/routes/{id}/operations/{created.Id}", created);
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapPut("/{id:guid}/operations/{operationId:guid}", async (
            Guid id, Guid operationId, UpdateRouteOperationRequest request,
            IRouteService service, HttpContext ctx, CancellationToken ct) =>
        {
            var updated = await service.UpdateOperationAsync(id, operationId, request, ctx.User.ToUserContext(), ct);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapDelete("/{id:guid}/operations/{operationId:guid}", async (
            Guid id, Guid operationId, IRouteService service, HttpContext ctx, CancellationToken ct) =>
        {
            var removed = await service.DeleteOperationAsync(id, operationId, ctx.User.ToUserContext(), ct);
            return removed ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapPost("/{id:guid}/operations/{operationId:guid}/move", async (
            Guid id, Guid operationId, MoveRouteOperationRequest request,
            IRouteService service, HttpContext ctx, CancellationToken ct) =>
        {
            var moved = await service.MoveOperationAsync(id, operationId, request, ctx.User.ToUserContext(), ct);
            return moved ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        return app;
    }
}
