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

        var runner = await CreateRunnerAsync(request.Context, ct);
        var expression = await runner.TranslateAsync(request.FieldType, request.NaturalLanguage, ct);
        return new TranslateResponse(expression, runner.Provider, runner.Model);
    }

    public async Task<IAiTranslationRunner> CreateRunnerAsync(AiContext context, CancellationToken ct = default)
    {
        var resolved = await settings.ResolveProviderAsync(null, ct);
        var instruction = await db.AiInstructions
            .Where(i => i.Context == context)
            .Select(i => i.SystemInstructions)
            .FirstOrDefaultAsync(ct) ?? string.Empty;
        var system = string.IsNullOrWhiteSpace(instruction) ? SyntaxGrounding : $"{SyntaxGrounding}\n\n{instruction}";

        return new AiTranslationRunner(settings, clientFactory.Create(resolved.Provider), resolved, system, context);
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
            return new TestProviderResponse(true, string.IsNullOrWhiteSpace(reply.Text) ? "Connected." : reply.Text.Trim());
        }
        catch (Exception ex)
        {
            return new TestProviderResponse(false, ex.Message);
        }
    }

    /// <summary>Holds the resolved provider and the current grounding handle across many cells.</summary>
    private sealed class AiTranslationRunner(
        IAiSettingsService settings,
        ILlmClient client,
        ResolvedProvider resolved,
        string systemInstructions,
        AiContext context) : IAiTranslationRunner
    {
        private string? _groundingHandle = resolved.GroundingHandle;

        public AiProvider Provider => resolved.Provider;
        public string Model => resolved.Model;

        public async Task<string> TranslateAsync(
            string fieldType, string naturalLanguage, CancellationToken ct = default)
        {
            var field = string.Equals(fieldType, "formula", StringComparison.OrdinalIgnoreCase) ? "formula" : "condition";
            var prompt = $"Translate the following into a Bluestar PLM {context} {field}. " +
                         $"Return only the {field} expression.\n\n{naturalLanguage}";

            var response = await client.CompleteAsync(
                new LlmRequest(
                    systemInstructions, prompt, resolved.Model, resolved.ApiKey,
                    resolved.GroundingPdf, resolved.GroundingFileName, _groundingHandle),
                ct);

            if (response.GroundingHandle is not null)
            {
                _groundingHandle = response.GroundingHandle;
                await settings.SaveGroundingHandleAsync(
                    resolved.Provider, response.GroundingHandle, response.GroundingExpiresAt, resolved.GroundingHash, ct);
            }

            return response.Text;
        }
    }
}
