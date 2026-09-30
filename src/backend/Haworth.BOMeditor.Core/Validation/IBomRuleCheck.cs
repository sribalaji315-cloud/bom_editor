using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Validation;

/// <summary>A single rule violation. Severity and rule code are attached by the validation service.</summary>
public sealed record ValidationIssue(Guid? LineId, string? LineDescription, string? Field, string Message);

/// <summary>
/// One built-in check. Implementations are pure and stateless; the service resolves them by
/// <see cref="Type"/> from the registered set.
/// </summary>
public interface IBomRuleCheck
{
    ValidationRuleType Type { get; }
    IEnumerable<ValidationIssue> Check(ValidationContext context, ValidationRule rule);
}
