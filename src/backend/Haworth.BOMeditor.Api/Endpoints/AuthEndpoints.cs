using Haworth.BOMeditor.Api.Auth;
using Haworth.BOMeditor.Data.Identity;
using Microsoft.AspNetCore.Identity;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/login", async (
            LoginRequest request,
            UserManager<AppUser> userManager,
            JwtTokenService tokens) =>
        {
            var user = await userManager.FindByEmailAsync(request.Email);
            if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
                return Results.Unauthorized();

            var roles = await userManager.GetRolesAsync(user);
            var (token, expiresAt) = tokens.CreateToken(user, roles);
            var dto = new AuthUserDto(user.Id, user.Email ?? string.Empty, user.DisplayName, roles.ToList());
            return Results.Ok(new LoginResponse(token, expiresAt, dto));
        });

        group.MapGet("/me", (HttpContext ctx) =>
        {
            var user = ctx.User;
            var id = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return Results.Ok(new
            {
                Id = id,
                Email = user.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value,
                Name = user.Identity?.Name,
                Roles = user.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value)
            });
        }).RequireAuthorization();

        return app;
    }
}
