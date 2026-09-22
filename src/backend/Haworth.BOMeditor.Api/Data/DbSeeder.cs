using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Data;
using Haworth.BOMeditor.Data.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Data;

/// <summary>Applies migrations and seeds the four roles plus one dev user per role.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;

        var db = sp.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var roleManager = sp.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in AppRole.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role) { Id = Guid.NewGuid() });
        }

        var userManager = sp.GetRequiredService<UserManager<AppUser>>();
        foreach (var role in AppRole.All)
        {
            var email = $"{role.ToLowerInvariant()}@bomeditor.local";
            if (await userManager.FindByEmailAsync(email) is not null) continue;

            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = role
            };
            // Dev-only credentials; replace with SSO before any non-local deployment.
            var result = await userManager.CreateAsync(user, "Passw0rd!");
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, role);
        }
    }
}
