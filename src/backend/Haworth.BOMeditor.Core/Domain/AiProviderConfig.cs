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
    public DateTimeOffset UpdatedAt { get; set; }
}
