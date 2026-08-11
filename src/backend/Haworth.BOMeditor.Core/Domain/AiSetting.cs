using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>Single-row global AI settings: active provider and the shared grounding document.</summary>
public class AiSetting
{
    public Guid Id { get; set; }
    public AiProvider ActiveProvider { get; set; }
    public bool GroundingEnabled { get; set; }
    public string? GroundingFileName { get; set; }
    public string? GroundingFilePath { get; set; }
}
