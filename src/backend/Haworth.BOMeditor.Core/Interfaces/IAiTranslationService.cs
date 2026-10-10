using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>Composes grounding + instructions + request and calls the active LLM provider.</summary>
public interface IAiTranslationService
{
    Task<TranslateResponse> TranslateAsync(TranslateRequest request, CancellationToken ct = default);
    Task<TestProviderResponse> TestAsync(AiProvider provider, CancellationToken ct = default);

    /// <summary>
    /// Resolves the provider, instructions and grounding once so a caller can translate many cells
    /// without repeating that work per call.
    /// </summary>
    Task<IAiTranslationRunner> CreateRunnerAsync(AiContext context, CancellationToken ct = default);
}

/// <summary>A provider bound to one editing context, reusable across many cells.</summary>
public interface IAiTranslationRunner
{
    AiProvider Provider { get; }
    string Model { get; }
    Task<string> TranslateAsync(string fieldType, string naturalLanguage, CancellationToken ct = default);
}
