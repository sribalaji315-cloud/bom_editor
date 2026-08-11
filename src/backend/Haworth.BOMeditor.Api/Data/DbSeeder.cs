using Haworth.BOMeditor.Core.Domain;
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

        await SeedAiDefaultsAsync(db);
    }

    private static async Task SeedAiDefaultsAsync(AppDbContext db)
    {
        var now = DateTimeOffset.UtcNow;

        if (!await db.AiSettings.AnyAsync())
        {
            db.AiSettings.Add(new AiSetting
            {
                Id = Guid.NewGuid(),
                ActiveProvider = AiProvider.OpenAI,
                GroundingEnabled = true
            });
        }

        var defaultModels = new Dictionary<AiProvider, string>
        {
            [AiProvider.OpenAI] = "gpt-4o",
            [AiProvider.Anthropic] = "claude-3-5-sonnet-latest",
            [AiProvider.Gemini] = "gemini-1.5-pro"
        };
        foreach (var (provider, model) in defaultModels)
        {
            if (await db.AiProviderConfigs.AnyAsync(c => c.Provider == provider)) continue;
            db.AiProviderConfigs.Add(new AiProviderConfig
            {
                Id = Guid.NewGuid(),
                Provider = provider,
                Model = model,
                Enabled = false,
                UpdatedAt = now
            });
        }

        var defaultInstructions = new Dictionary<AiContext, string>
        {
            [AiContext.Bom] =
                "Context: BOM line conditions and formulas. Conditions gate whether a line is included; " +
                "formulas compute quantities. Prefer the ECO/configurator variables shown in the reference guide.",
            [AiContext.Route] =
                "Context: route operation conditions and formulas. Conditions gate whether an operation runs; " +
                "formulas compute times or quantities. Use the operation-level variables shown in the reference guide."
        };
        foreach (var (context, text) in defaultInstructions)
        {
            if (await db.AiInstructions.AnyAsync(i => i.Context == context)) continue;
            db.AiInstructions.Add(new AiInstruction
            {
                Id = Guid.NewGuid(),
                Context = context,
                SystemInstructions = text,
                UpdatedAt = now
            });
        }

        await db.SaveChangesAsync();
    }
}
