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
        await RecoverAiJobsAsync(db);
        await SeedValidationRulesAsync(db);
        await SeedOperationsAsync(db);
    }

    /// <summary>
    /// The translation queue lives in this process, so anything still queued or running was killed by
    /// a restart and can never resume.
    /// </summary>
    private static async Task RecoverAiJobsAsync(AppDbContext db)
    {
        var interrupted = await db.AiTranslationJobs
            .Where(j => j.Status == AiJobStatus.Queued || j.Status == AiJobStatus.Running)
            .ToListAsync();
        if (interrupted.Count == 0) return;

        foreach (var job in interrupted)
        {
            job.Status = AiJobStatus.Failed;
            job.Error = "Interrupted by a server restart.";
            job.CompletedAt = DateTimeOffset.UtcNow;
        }
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// One-time backfill of the operation master data from the operation IDs already used by existing
    /// routes, so every imported route operation still resolves in the picker.
    /// </summary>
    private static async Task SeedOperationsAsync(AppDbContext db)
    {
        if (await db.Operations.AnyAsync()) return;

        var existing = await db.RouteOperations
            .Where(o => o.OperationId != null && o.OperationId != "")
            .Select(o => new { o.OperationId, o.Description })
            .ToListAsync();

        var now = DateTimeOffset.UtcNow;
        var seen = new Dictionary<string, Operation>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in existing)
        {
            var code = row.OperationId!.Trim();
            if (code.Length == 0) continue;

            if (!seen.TryGetValue(code, out var operation))
            {
                operation = new Operation
                {
                    Id = Guid.NewGuid(),
                    Code = code,
                    Description = string.Empty,
                    Status = OperationStatus.Approved,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                seen.Add(code, operation);
            }

            // First non-empty description wins; the code itself is the fallback so the column stays required.
            if (operation.Description.Length == 0 && !string.IsNullOrWhiteSpace(row.Description))
                operation.Description = row.Description.Trim();
        }

        foreach (var operation in seen.Values)
        {
            if (operation.Description.Length == 0) operation.Description = operation.Code;
            db.Operations.Add(operation);
        }

        if (seen.Count > 0) await db.SaveChangesAsync();
    }

    /// <summary>
    /// Creates the starter rule catalog. Idempotent by Code, so rules an admin has since edited or
    /// deleted are never resurrected or overwritten.
    /// </summary>
    private static async Task SeedValidationRulesAsync(AppDbContext db)
    {
        if (await db.ValidationRules.AnyAsync()) return;

        var now = DateTimeOffset.UtcNow;
        var defaults = new (string Code, string Name, ValidationRuleType Type, ValidationSeverity Severity,
            string? Field, string? Parameters, string? AppliesWhen, string? Message)[]
        {
            ("REQ-DESCRIPTION", "Description is required", ValidationRuleType.RequiredField,
                ValidationSeverity.Error, "description", null, null, "Description is required."),
            ("REQ-BSOBJECTID", "BS Object ID is required", ValidationRuleType.RequiredField,
                ValidationSeverity.Error, "bsObjectId", null, null, "BS Object ID is required."),
            ("REQ-CLASS", "Class is required", ValidationRuleType.RequiredField,
                ValidationSeverity.Error, "class", null, null, "Class is required."),
            ("REQ-ROUTE", "Route is required on real parts", ValidationRuleType.RequiredField,
                ValidationSeverity.Warning, "route", null, "phantom = false",
                "Route is required on non-phantom lines."),
            ("NUM-FINALQTY", "Final quantity must be numeric", ValidationRuleType.NumericField,
                ValidationSeverity.Error, "finalQuantity", "Formula", null,
                "Final quantity '{value}' is not a number."),
            ("NUM-WEIGHT", "Weight must be numeric", ValidationRuleType.NumericField,
                ValidationSeverity.Warning, "weightKg", "Formula", null, "Weight '{value}' is not a number."),
            ("LEN-DESCRIPTION", "Description length", ValidationRuleType.MaxLength,
                ValidationSeverity.Warning, "description", "60", null,
                "Description is longer than {parameters} characters."),
            ("LOOKUP-TEMPLATE", "Release template must be defined", ValidationRuleType.ReleaseTemplateExists,
                ValidationSeverity.Warning, null, null, null,
                "Release template '{value}' is not a defined active template."),
            ("LOOKUP-ROUTE", "Route must be defined", ValidationRuleType.RouteCodeExists,
                ValidationSeverity.Warning, null, null, null, "Route '{value}' is not a defined active route."),
            ("UNIQUE-CHILD-ID", "No duplicate BS Object ID under one parent", ValidationRuleType.UniqueChildBsObjectId,
                ValidationSeverity.Warning, null, null, null,
                "BS Object ID '{value}' appears more than once under the same parent."),
            ("MAX-DEPTH", "Maximum hierarchy depth", ValidationRuleType.MaxDepth,
                ValidationSeverity.Error, null, "8", null, "Line is deeper than {parameters} levels."),
            ("PLM-CONDITION", "Condition must be translated", ValidationRuleType.PlmExpressionRequired,
                ValidationSeverity.Error, "conditions", null, null,
                "Conditions have no translated PLM expression."),
            ("PLM-FORMULA", "Formula must be translated", ValidationRuleType.PlmExpressionRequired,
                ValidationSeverity.Error, "formula", null, null, "Formula has no translated PLM expression."),
            ("PHANTOM-CHILDREN", "Phantom lines need children", ValidationRuleType.PhantomMustHaveChildren,
                ValidationSeverity.Warning, null, null, null, "Phantom line has no child lines.")
        };

        foreach (var (code, name, type, severity, field, parameters, appliesWhen, message) in defaults)
        {
            db.ValidationRules.Add(new ValidationRule
            {
                Id = Guid.NewGuid(),
                Code = code,
                Name = name,
                Type = type,
                Severity = severity,
                TargetField = field,
                Parameters = parameters,
                AppliesWhen = appliesWhen,
                Message = message,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await db.SaveChangesAsync();
    }

    /// <summary>Creates disabled provider rows and empty instruction rows so the admin page has something to edit.</summary>
    private static async Task SeedAiDefaultsAsync(AppDbContext db)
    {
        var defaultModels = new Dictionary<AiProvider, string>
        {
            [AiProvider.OpenAI] = "gpt-4o",
            [AiProvider.Anthropic] = "claude-3-5-sonnet-latest",
            [AiProvider.Gemini] = "gemini-1.5-pro"
        };

        var existingProviders = await db.AiProviderConfigs.Select(c => c.Provider).ToListAsync();
        foreach (var (provider, model) in defaultModels)
        {
            if (existingProviders.Contains(provider)) continue;
            db.AiProviderConfigs.Add(new AiProviderConfig
            {
                Id = Guid.NewGuid(),
                Provider = provider,
                Model = model,
                Enabled = false,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        }

        var existingContexts = await db.AiInstructions.Select(i => i.Context).ToListAsync();
        foreach (var context in new[] { AiContext.Bom, AiContext.Route })
        {
            if (existingContexts.Contains(context)) continue;
            db.AiInstructions.Add(new AiInstruction
            {
                Id = Guid.NewGuid(),
                Context = context,
                SystemInstructions = string.Empty,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        }

        if (!await db.AiSettings.AnyAsync())
        {
            db.AiSettings.Add(new AiSetting
            {
                Id = Guid.NewGuid(),
                ActiveProvider = AiProvider.OpenAI,
                GroundingEnabled = true
            });
        }

        await db.SaveChangesAsync();
    }
}
