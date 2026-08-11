using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class ReleaseTemplateEndpoints
{
    public static IEndpointRouteBuilder MapReleaseTemplateEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/release-templates").RequireAuthorization();

        group.MapGet("/", async (IReleaseTemplateService service, CancellationToken ct) =>
            Results.Ok(await service.GetAllAsync(ct)));

        group.MapPost("/", async (
            CreateReleaseTemplateRequest request, IReleaseTemplateService service, CancellationToken ct) =>
        {
            try
            {
                var created = await service.CreateAsync(request, ct);
                return Results.Created($"/api/release-templates/{created.Id}", created);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(UserEndpoints.AdminPolicy);

        group.MapPut("/{id:guid}", async (
            Guid id, UpdateReleaseTemplateRequest request, IReleaseTemplateService service, CancellationToken ct) =>
        {
            try
            {
                return Results.Ok(await service.UpdateAsync(id, request, ct));
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(UserEndpoints.AdminPolicy);

        group.MapDelete("/{id:guid}", async (Guid id, IReleaseTemplateService service, CancellationToken ct) =>
        {
            try
            {
                await service.DeleteAsync(id, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
        }).RequireAuthorization(UserEndpoints.AdminPolicy);

        return app;
    }
}
