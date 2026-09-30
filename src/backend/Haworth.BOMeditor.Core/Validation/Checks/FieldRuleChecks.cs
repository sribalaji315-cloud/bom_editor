using System.Globalization;
using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Validation.Checks;

/// <summary>Shared plumbing for rules that inspect a single field on every line.</summary>
public abstract class FieldRuleCheck : IBomRuleCheck
{
    public abstract ValidationRuleType Type { get; }

    public IEnumerable<ValidationIssue> Check(ValidationContext context, ValidationRule rule)
    {
        foreach (var line in context.LinesFor(rule))
        {
            if (!BomLineFieldCatalog.TryRead(line, rule.TargetField, out var value)) continue;
            var message = Evaluate(rule, value);
            if (message is null) continue;
            yield return new ValidationIssue(line.Id, line.Description, rule.TargetField, message);
        }
    }

    /// <summary>Returns the issue message, or null when the value passes.</summary>
    protected abstract string? Evaluate(ValidationRule rule, string? value);

    protected static IReadOnlyList<string> SplitParameters(ValidationRule rule) =>
        (rule.Parameters ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

public sealed class RequiredFieldCheck : FieldRuleCheck
{
    public override ValidationRuleType Type => ValidationRuleType.RequiredField;

    protected override string? Evaluate(ValidationRule rule, string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? RuleMessage.Format(rule, $"{rule.TargetField} is required.")
            : null;
}

public sealed class NumericFieldCheck : FieldRuleCheck
{
    public override ValidationRuleType Type => ValidationRuleType.NumericField;

    protected override string? Evaluate(ValidationRule rule, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        // Source CSVs use literal tokens such as "Formula" in numeric columns; Parameters lists the allowed ones.
        if (SplitParameters(rule).Contains(value.Trim(), StringComparer.OrdinalIgnoreCase)) return null;
        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out _)
            ? null
            : RuleMessage.Format(rule, $"{rule.TargetField} must be a number.", value: value);
    }
}

public sealed class AllowedValuesCheck : FieldRuleCheck
{
    public override ValidationRuleType Type => ValidationRuleType.AllowedValues;

    protected override string? Evaluate(ValidationRule rule, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var allowed = SplitParameters(rule);
        if (allowed.Count == 0 || allowed.Contains(value.Trim(), StringComparer.OrdinalIgnoreCase)) return null;
        return RuleMessage.Format(rule, $"{rule.TargetField} must be one of: {rule.Parameters}.", value: value);
    }
}

public sealed class MaxLengthCheck : FieldRuleCheck
{
    public override ValidationRuleType Type => ValidationRuleType.MaxLength;

    protected override string? Evaluate(ValidationRule rule, string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        if (!int.TryParse(rule.Parameters, NumberStyles.Integer, CultureInfo.InvariantCulture, out var max)) return null;
        return value.Length > max
            ? RuleMessage.Format(rule, $"{rule.TargetField} must be at most {max} characters.", value: value)
            : null;
    }
}
