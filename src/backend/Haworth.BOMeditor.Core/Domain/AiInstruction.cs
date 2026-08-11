using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>Admin-editable system instructions layered on top of the fixed PLM syntax grounding.</summary>
public class AiInstruction
{
    public Guid Id { get; set; }
    public AiContext Context { get; set; }
    public string SystemInstructions { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; set; }
}
