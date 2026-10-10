using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>Per-provider LLM configuration. The API key is stored encrypted, never in plain text.</summary>
public class AiProviderConfig
{
    public Guid Id { get; set; }
    public AiProvider Provider { get; set; }
    public string Model { get; set; } = string.Empty;
    public string? ApiKeyEncrypted { get; set; }
    public bool Enabled { get; set; }
    /// <summary>Provider-side id of the uploaded grounding document, so the PDF is not re-sent per call.</summary>
    public string? GroundingHandle { get; set; }
    public DateTimeOffset? GroundingHandleExpiresAt { get; set; }
    /// <summary>Hash of the PDF the handle was created from; a re-upload invalidates it.</summary>
    public string? GroundingHash { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
