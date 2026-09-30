using System.Globalization;
using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Validation.Checks;

/// <summary>The release template on a line must be one the admin still has active.</summary>
public sealed class ReleaseTemplateExistsCheck : IBomRuleCheck
{
    public ValidationRuleType Type => ValidationRuleType.ReleaseTemplateExists;

    public IEnumerable<ValidationIssue> Check(ValidationContext context, ValidationRule rule)
    {
        foreach (var line in context.LinesFor(rule))
        {
            var value = line.ReleaseTemplate;
            if (string.IsNullOrWhiteSpace(value) || context.ActiveReleaseTemplates.Contains(value.Trim())) continue;
            yield return new ValidationIssue(line.Id, line.Description, "releaseTemplate",
                RuleMessage.Format(rule, $"Release template '{value}' is not a defined active template.", "releaseTemplate", value));
        }
    }
}

/// <summary>The route code on a line must resolve to an active route.</summary>
public sealed class RouteCodeExistsCheck : IBomRuleCheck
{
    public ValidationRuleType Type => ValidationRuleType.RouteCodeExists;

    public IEnumerable<ValidationIssue> Check(ValidationContext context, ValidationRule rule)
    {
        foreach (var line in context.LinesFor(rule))
        {
            var value = line.Route;
            if (string.IsNullOrWhiteSpace(value) || context.ActiveRouteCodes.Contains(value.Trim())) continue;
            yield return new ValidationIssue(line.Id, line.Description, "route",
                RuleMessage.Format(rule, $"Route '{value}' is not a defined active route.", "route", value));
        }
    }
}

/// <summary>Two children of the same parent must not carry the same BS Object ID.</summary>
public sealed class UniqueChildBsObjectIdCheck : IBomRuleCheck
{
    public ValidationRuleType Type => ValidationRuleType.UniqueChildBsObjectId;

    public IEnumerable<ValidationIssue> Check(ValidationContext context, ValidationRule rule)
    {
        foreach (var siblings in context.LinesFor(rule).ToLookup(l => l.ParentId))
        {
            var duplicates = siblings
                .Where(l => !string.IsNullOrWhiteSpace(l.BsObjectId))
                .GroupBy(l => l.BsObjectId!.Trim(), StringComparer.OrdinalIgnoreCase)
                .Where(g => g.Count() > 1);

            foreach (var group in duplicates)
                foreach (var line in group)
                    yield return new ValidationIssue(line.Id, line.Description, "bsObjectId",
                        RuleMessage.Format(rule, $"BS Object ID '{group.Key}' appears more than once under the same parent.",
                            "bsObjectId", group.Key));
        }
    }
}

/// <summary>The tree must not be deeper than the target system supports.</summary>
public sealed class MaxDepthCheck : IBomRuleCheck
{
    public ValidationRuleType Type => ValidationRuleType.MaxDepth;

    public IEnumerable<ValidationIssue> Check(ValidationContext context, ValidationRule rule)
    {
        if (!int.TryParse(rule.Parameters, NumberStyles.Integer, CultureInfo.InvariantCulture, out var max))
            yield break;

        foreach (var line in context.LinesFor(rule))
        {
            var level = context.LevelOf(line);
            if (level <= max) continue;
            yield return new ValidationIssue(line.Id, line.Description, null,
                RuleMessage.Format(rule, $"Line is at level {level}; the maximum is {max}.", value: level.ToString(CultureInfo.InvariantCulture)));
        }
    }
}

/// <summary>
/// A natural-language rule must have been translated before it reaches PLM. TargetField selects
/// which pair is checked: "conditions" or "formula".
/// </summary>
public sealed class PlmExpressionRequiredCheck : IBomRuleCheck
{
    public ValidationRuleType Type => ValidationRuleType.PlmExpressionRequired;

    public IEnumerable<ValidationIssue> Check(ValidationContext context, ValidationRule rule)
    {
        var isFormula = string.Equals(rule.TargetField, "formula", StringComparison.OrdinalIgnoreCase);
        var sourceField = isFormula ? "formula" : "conditions";
        var plmField = isFormula ? "formulaPlm" : "conditionsPlm";

        foreach (var line in context.LinesFor(rule))
        {
            var source = isFormula ? line.Formula : line.Conditions;
            var plm = isFormula ? line.FormulaPlm : line.ConditionsPlm;
            if (string.IsNullOrWhiteSpace(source) || !string.IsNullOrWhiteSpace(plm)) continue;
            yield return new ValidationIssue(line.Id, line.Description, plmField,
                RuleMessage.Format(rule, $"{sourceField} has no translated PLM expression.", sourceField));
        }
    }
}

/// <summary>A phantom line only makes sense when it has components beneath it.</summary>
public sealed class PhantomMustHaveChildrenCheck : IBomRuleCheck
{
    public ValidationRuleType Type => ValidationRuleType.PhantomMustHaveChildren;

    public IEnumerable<ValidationIssue> Check(ValidationContext context, ValidationRule rule)
    {
        foreach (var line in context.LinesFor(rule))
        {
            if (!line.Phantom || context.ChildrenByParent[line.Id].Any()) continue;
            yield return new ValidationIssue(line.Id, line.Description, "phantom",
                RuleMessage.Format(rule, "Phantom line has no child lines.", "phantom"));
        }
    }
}
