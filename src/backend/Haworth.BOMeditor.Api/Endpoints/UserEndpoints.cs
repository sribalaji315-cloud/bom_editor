using System.Security.Claims;
using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class UserEndpoints
{
    public const string AdminPolicy = "AdminOnly";

    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").RequireAuthorization(AdminPolicy);

        group.MapGet("/", async (IUserService service, CancellationToken ct) =>
            Results.Ok(await service.GetUsersAsync(ct)));

        group.MapPost("/", async (CreateUserRequest request, IUserService service, CancellationToken ct) =>
        {
            try
            {
                var created = await service.CreateUserAsync(request, ct);
                return Results.Created($"/api/users/{created.Id}", created);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        });

        group.MapPut("/{id:guid}/roles", async (
            Guid id, UpdateUserRolesRequest request, IUserService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                var updated = await service.UpdateRolesAsync(id, request, CurrentUserId(ctx), ct);
                return Results.Ok(updated);
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        });

        group.MapPut("/{id:guid}/enabled", async (
            Guid id, SetUserEnabledRequest request, IUserService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                var updated = await service.SetEnabledAsync(id, request.Enabled, CurrentUserId(ctx), ct);
                return Results.Ok(updated);
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        });

        group.MapPost("/{id:guid}/reset-password", async (
            Guid id, ResetPasswordRequest request, IUserService service, CancellationToken ct) =>
        {
            try
            {
                await service.ResetPasswordAsync(id, request, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        });

        group.MapDelete("/{id:guid}", async (Guid id, IUserService service, HttpContext ctx, CancellationToken ct) =>
        {
            try
            {
                await service.DeleteUserAsync(id, CurrentUserId(ctx), ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        });

        return app;
    }

    private static Guid CurrentUserId(HttpContext ctx) =>
        Guid.TryParse(ctx.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;
}
