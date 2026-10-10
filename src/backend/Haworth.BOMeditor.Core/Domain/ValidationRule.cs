using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// An admin-configured instance of a built-in <see cref="ValidationRuleType"/>. Rule logic lives in
/// code; severity, target field, parameters and the user-facing message are data so they can be
/// tuned without a deployment.
/// </summary>
public class ValidationRule
{
    public Guid Id { get; set; }

    /// <summary>Stable identifier used by the seeder and shown next to each reported issue.</summary>
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public ValidationRuleType Type { get; set; }
    public ValidationSeverity Severity { get; set; } = ValidationSeverity.Error;

    /// <summary>BOM line field key the rule inspects; unused by rules that span the whole tree.</summary>
    public string? TargetField { get; set; }

    /// <summary>Rule-type specific argument: a number, or a comma-separated list of literals.</summary>
    public string? Parameters { get; set; }

    /// <summary>Optional line filter, e.g. "phantom = false"; empty means the rule applies to every line.</summary>
    public string? AppliesWhen { get; set; }

    /// <summary>Comma-separated document statuses the rule runs in; empty means every status.</summary>
    public string? AppliesToStatuses { get; set; }

    /// <summary>Message shown to the user; supports {field}, {value} and {parameters} placeholders.</summary>
    public string? Message { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
