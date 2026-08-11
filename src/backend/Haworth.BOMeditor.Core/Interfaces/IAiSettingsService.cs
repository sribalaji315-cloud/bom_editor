using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>Owns AI provider configuration, encrypted key storage, and the grounding document.</summary>
public interface IAiSettingsService
{
    Task<AiSettingsDto> GetAsync(CancellationToken ct = default);
    Task<AiSettingsDto> UpdateAsync(UpdateAiSettingsRequest request, CancellationToken ct = default);
    Task SetGroundingFileAsync(string fileName, Stream content, CancellationToken ct = default);

    /// <summary>Resolves a provider with its decrypted key and grounding bytes for a translation call.</summary>
    Task<ResolvedProvider> ResolveProviderAsync(AiProvider? provider, CancellationToken ct = default);
}
