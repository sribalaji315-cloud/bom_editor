using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class OperationEndpoints
{
    public static IEndpointRouteBuilder MapOperationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/operations").RequireAuthorization();

        group.MapGet("/", async (IOperationService service, CancellationToken ct) =>
            Results.Ok(await service.GetAllAsync(ct)));

        group.MapGet("/selectable", async (IOperationService service, CancellationToken ct) =>
            Results.Ok(await service.GetSelectableAsync(ct)));

        // Open to every authenticated user: the request only queues a definition for review.
        group.MapPost("/requests", async (
            RequestOperationRequest request, IOperationService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                var created = await service.RequestAsync(request, ctx.User.ToUserContext(), ct);
                return Results.Created($"/api/operations/{created.Id}", created);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        });

        group.MapPost("/", async (
            CreateOperationRequest request, IOperationService service, CancellationToken ct) =>
        {
            try
            {
                var created = await service.CreateAsync(request, ct);
                return Results.Created($"/api/operations/{created.Id}", created);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapPut("/{id:guid}", async (
            Guid id, UpdateOperationRequest request, IOperationService service, CancellationToken ct) =>
        {
            try
            {
                return Results.Ok(await service.UpdateAsync(id, request, ct));
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapPost("/{id:guid}/approve", async (
            Guid id, ReviewOperationRequest request, IOperationService service,
            HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                return Results.Ok(await service.ApproveAsync(id, request, ctx.User.ToUserContext(), ct));
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapPost("/{id:guid}/reject", async (
            Guid id, IOperationService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                return Results.Ok(await service.RejectAsync(id, ctx.User.ToUserContext(), ct));
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        group.MapDelete("/{id:guid}", async (Guid id, IOperationService service, CancellationToken ct) =>
        {
            try
            {
                await service.DeleteAsync(id, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        return app;
    }
}
