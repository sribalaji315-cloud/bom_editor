using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

public class AiTranslationService(
    AppDbContext db,
    IAiSettingsService settings,
    ILlmClientFactory clientFactory) : IAiTranslationService
{
    // Fixed grounding layer; the attached reference PDF defines the actual Bluestar grammar.
    private const string SyntaxGrounding =
        "You translate plain-language manufacturing rules into Bluestar PLM Configurator condition/formula syntax. " +
        "The attached reference guide defines the exact grammar, operators, functions and variable names you must use. " +
        "Return ONLY the resulting expression with no explanation, code fences, or surrounding text.";

    public async Task<TranslateResponse> TranslateAsync(TranslateRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.NaturalLanguage))
            throw new InvalidOperationException("Natural language text is required.");

        var resolved = await settings.ResolveProviderAsync(null, ct);
        var instruction = await db.AiInstructions
            .Where(i => i.Context == request.Context)
            .Select(i => i.SystemInstructions)
            .FirstOrDefaultAsync(ct) ?? string.Empty;

        var fieldType = string.Equals(request.FieldType, "formula", StringComparison.OrdinalIgnoreCase) ? "formula" : "condition";
        var system = string.IsNullOrWhiteSpace(instruction) ? SyntaxGrounding : $"{SyntaxGrounding}\n\n{instruction}";
        var user = $"Translate the following into a Bluestar PLM {request.Context} {fieldType}. " +
                   $"Return only the {fieldType} expression.\n\n{request.NaturalLanguage}";

        var client = clientFactory.Create(resolved.Provider);
        var expression = await client.CompleteAsync(
            new LlmRequest(system, user, resolved.Model, resolved.ApiKey, resolved.GroundingPdf, resolved.GroundingFileName), ct);

        return new TranslateResponse(expression, resolved.Provider, resolved.Model);
    }

    public async Task<TestProviderResponse> TestAsync(AiProvider provider, CancellationToken ct = default)
    {
        try
        {
            var resolved = await settings.ResolveProviderAsync(provider, ct);
            var client = clientFactory.Create(resolved.Provider);
            // Minimal ungrounded round-trip to validate credentials and model.
            var reply = await client.CompleteAsync(
                new LlmRequest("You are a connectivity test.", "Reply with the single word OK.", resolved.Model, resolved.ApiKey, null, null), ct);
            return new TestProviderResponse(true, string.IsNullOrWhiteSpace(reply) ? "Connected." : reply.Trim());
        }
        catch (Exception ex)
        {
            return new TestProviderResponse(false, ex.Message);
        }
    }
}
