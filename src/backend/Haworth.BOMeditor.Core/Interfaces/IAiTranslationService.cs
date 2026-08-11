using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>Composes grounding + instructions + request and calls the active LLM provider.</summary>
public interface IAiTranslationService
{
    Task<TranslateResponse> TranslateAsync(TranslateRequest request, CancellationToken ct = default);
    Task<TestProviderResponse> TestAsync(AiProvider provider, CancellationToken ct = default);
}
