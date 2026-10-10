using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Dtos;

public record ProviderConfigDto(AiProvider Provider, string Model, bool Enabled, bool HasKey);

public record InstructionDto(AiContext Context, string SystemInstructions);

public record AiSettingsDto(
    AiProvider ActiveProvider,
    bool GroundingEnabled,
    string? GroundingFileName,
    IReadOnlyList<ProviderConfigDto> Providers,
    IReadOnlyList<InstructionDto> Instructions);

public record UpdateProviderConfigRequest(AiProvider Provider, string Model, bool Enabled, string? ApiKey);

public record UpdateInstructionRequest(AiContext Context, string SystemInstructions);

public record UpdateAiSettingsRequest(
    AiProvider ActiveProvider,
    bool GroundingEnabled,
    IReadOnlyList<UpdateProviderConfigRequest> Providers,
    IReadOnlyList<UpdateInstructionRequest> Instructions);

public record TranslateRequest(AiContext Context, string FieldType, string NaturalLanguage);

public record TranslateResponse(string Expression, AiProvider Provider, string Model);

public record TestProviderRequest(AiProvider Provider);

public record TestProviderResponse(bool Success, string Message);

/// <summary>Server-side resolution of the active provider including secrets; never serialized to clients.</summary>
public record ResolvedProvider(
    AiProvider Provider,
    string Model,
    string ApiKey,
    byte[]? GroundingPdf,
    string? GroundingFileName,
    string? GroundingHandle = null,
    string? GroundingHash = null);
