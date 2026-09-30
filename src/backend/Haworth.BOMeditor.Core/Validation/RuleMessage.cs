using Haworth.BOMeditor.Core.Domain;

namespace Haworth.BOMeditor.Core.Validation;

/// <summary>Builds the user-facing text for an issue from the admin-authored rule message.</summary>
public static class RuleMessage
{
    public static string Format(ValidationRule rule, string fallback, string? field = null, string? value = null)
    {
        var template = string.IsNullOrWhiteSpace(rule.Message) ? fallback : rule.Message!;
        return template
            .Replace("{field}", field ?? rule.TargetField ?? string.Empty)
            .Replace("{value}", value ?? string.Empty)
            .Replace("{parameters}", rule.Parameters ?? string.Empty);
    }
}
