using System.Text.Json;
using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class BomEndpoints
{
    public const string EditPolicy = "CanEditBom";

    public static IEndpointRouteBuilder MapBomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/boms").RequireAuthorization();

        group.MapGet("/", async (IBomService service, CancellationToken ct) =>
            Results.Ok(await service.GetDocumentsAsync(ct)));

        group.MapGet("/{id:guid}", async (Guid id, IBomService service, CancellationToken ct) =>
        {
            var doc = await service.GetDocumentAsync(id, ct);
            return doc is null ? Results.NotFound() : Results.Ok(doc);
        });

        group.MapGet("/{id:guid}/audit", async (Guid id, IBomService service, CancellationToken ct) =>
            Results.Ok(await service.GetAuditAsync(id, ct)));

        group.MapPost("/{id:guid}/status", async (
            Guid id, ChangeBomStatusRequest request, IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            var updated = await service.ChangeStatusAsync(id, request, ctx.User.ToUserContext(), ct);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        group.MapGet("/{id:guid}/versions", async (Guid id, IBomService service, CancellationToken ct) =>
            Results.Ok(await service.GetVersionsAsync(id, ct)));

        group.MapGet("/{id:guid}/versions/{versionId:guid}", async (
            Guid id, Guid versionId, IBomService service, CancellationToken ct) =>
        {
            var version = await service.GetVersionAsync(id, versionId, ct);
            return version is null ? Results.NotFound() : Results.Ok(version);
        });

        group.MapPost("/{id:guid}/versions", async (
            Guid id, CreateBomVersionRequest request, IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            var created = await service.CreateVersionAsync(id, request, ctx.User.ToUserContext(), ct);
            return created is null
                ? Results.NotFound()
                : Results.Created($"/api/boms/{id}/versions/{created.Id}", created);
        }).RequireAuthorization(EditPolicy);

        group.MapPost("/{id:guid}/versions/{versionId:guid}/restore", async (
            Guid id, Guid versionId, IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            var restored = await service.RestoreVersionAsync(id, versionId, ctx.User.ToUserContext(), ct);
            return restored ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(UserEndpoints.AdminPolicy);

        group.MapDelete("/{id:guid}", async (Guid id, IBomService service, CancellationToken ct) =>
        {
            var deleted = await service.DeleteDocumentAsync(id, ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(EditPolicy);

        group.MapPost("/import/inspect", async (
            HttpRequest http, ICsvImportService import, CancellationToken ct) =>
        {
            if (!http.HasFormContentType)
                return Results.BadRequest("Expected multipart/form-data with a 'file' field.");

            var form = await http.ReadFormAsync(ct);
            var file = form.Files["file"];
            if (file is null || file.Length == 0)
                return Results.BadRequest("No CSV file was provided.");

            await using var stream = file.OpenReadStream();
            try
            {
                return Results.Ok(await import.InspectAsync(stream, ct));
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(EditPolicy).DisableAntiforgery();

        group.MapPost("/import", async (
            HttpRequest http, ICsvImportService import, HttpContext ctx, CancellationToken ct) =>
        {
            if (!http.HasFormContentType)
                return Results.BadRequest("Expected multipart/form-data with a 'file' field.");

            var form = await http.ReadFormAsync(ct);
            var file = form.Files["file"];
            if (file is null || file.Length == 0)
                return Results.BadRequest("No CSV file was provided.");

            var name = form["name"].FirstOrDefault() ?? Path.GetFileNameWithoutExtension(file.FileName);
            var mappingJson = form["mapping"].FirstOrDefault();
            var mapping = string.IsNullOrWhiteSpace(mappingJson)
                ? new Dictionary<string, int>()
                : JsonSerializer.Deserialize<Dictionary<string, int>>(mappingJson) ?? new Dictionary<string, int>();

            await using var stream = file.OpenReadStream();
            try
            {
                var summary = await import.ImportAsync(stream, file.FileName, name, mapping, ctx.User.ToUserContext(), ct);
                return Results.Created($"/api/boms/{summary.Id}", summary);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(EditPolicy).DisableAntiforgery();

        group.MapPost("/{id:guid}/lines", async (
            Guid id, CreateBomLineRequest request, IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                var created = await service.CreateLineAsync(id, request, ctx.User.ToUserContext(), ct);
                return Results.Created($"/api/boms/{id}/lines/{created.Id}", created);
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(EditPolicy);

        group.MapPut("/{id:guid}/lines/{lineId:guid}", async (
            Guid id, Guid lineId, UpdateBomLineRequest request,
            IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            var updated = await service.UpdateLineAsync(id, lineId, request, ctx.User.ToUserContext(), ct);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        }).RequireAuthorization(EditPolicy);

        group.MapDelete("/{id:guid}/lines/{lineId:guid}", async (
            Guid id, Guid lineId, IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            var removed = await service.DeleteLineAsync(id, lineId, ctx.User.ToUserContext(), ct);
            return removed ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(EditPolicy);

        group.MapPost("/{id:guid}/lines/{lineId:guid}/restore", async (
            Guid id, Guid lineId, IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            var restored = await service.RestoreLineAsync(id, lineId, ctx.User.ToUserContext(), ct);
            return restored ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(EditPolicy);

        group.MapDelete("/{id:guid}/lines/{lineId:guid}/permanent", async (
            Guid id, Guid lineId, IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            var removed = await service.PurgeLineAsync(id, lineId, ctx.User.ToUserContext(), ct);
            return removed ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(EditPolicy);

        group.MapPost("/{id:guid}/lines/insert-bom", async (
            Guid id, InsertBomRequest request, IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                var inserted = await service.InsertBomAsync(id, request, ctx.User.ToUserContext(), ct);
                return inserted ? Results.NoContent() : Results.NotFound();
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(EditPolicy);

        group.MapPost("/{id:guid}/lines/{lineId:guid}/move", async (
            Guid id, Guid lineId, MoveBomLineRequest request,
            IBomService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                var moved = await service.MoveLineAsync(id, lineId, request, ctx.User.ToUserContext(), ct);
                return moved ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(EditPolicy);

        return app;
    }
}
