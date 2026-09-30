using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class ValidationEndpoints
{
    public static IEndpointRouteBuilder MapValidationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/boms/{id:guid}/validate", async (
            Guid id, IBomValidationService service, CancellationToken ct) =>
        {
            var report = await service.ValidateAsync(id, ct);
            return report is null ? Results.NotFound() : Results.Ok(report);
        }).RequireAuthorization();

        var rules = app.MapGroup("/api/validation-rules").RequireAuthorization();

        rules.MapGet("/", async (IValidationRuleService service, CancellationToken ct) =>
            Results.Ok(await service.GetAllAsync(ct)));

        rules.MapGet("/metadata", (IValidationRuleService service) =>
            Results.Ok(service.GetMetadata()));

        rules.MapPost("/", async (
            CreateValidationRuleRequest request, IValidationRuleService service, CancellationToken ct) =>
        {
            try
            {
                var created = await service.CreateAsync(request, ct);
                return Results.Created($"/api/validation-rules/{created.Id}", created);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(UserEndpoints.AdminPolicy);

        rules.MapPut("/{id:guid}", async (
            Guid id, UpdateValidationRuleRequest request, IValidationRuleService service, CancellationToken ct) =>
        {
            try
            {
                return Results.Ok(await service.UpdateAsync(id, request, ct));
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(UserEndpoints.AdminPolicy);

        rules.MapDelete("/{id:guid}", async (
            Guid id, IValidationRuleService service, CancellationToken ct) =>
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
