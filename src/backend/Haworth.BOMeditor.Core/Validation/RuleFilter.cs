using System.Globalization;
using System.Text.RegularExpressions;
using Haworth.BOMeditor.Core.Domain;

namespace Haworth.BOMeditor.Core.Validation;

/// <summary>
/// Evaluates a rule's "applies when" expression against a line so a rule can target a subset of the
/// BOM, for example only non-phantom lines. An empty expression matches every line.
/// <para>
/// Grammar: <c>comparison [(and|or) comparison]*</c> with <c>or</c> binding loosest. A comparison is
/// <c>field op value</c>, where op is one of = != &lt;&gt; &gt; &gt;= &lt; &lt;= contains startswith
/// in "not in" "is empty" "is not empty". Values may be quoted; <c>in</c> takes a comma-separated list.
/// </para>
/// </summary>
public static class RuleFilter
{
    /// <summary>Fields derived from the tree rather than stored on the line.</summary>
    public const string LevelField = "level";
    public const string HasChildrenField = "hasChildren";

    public static IReadOnlyList<string> Operators { get; } =
    [
        "=", "!=", "<>", ">", ">=", "<", "<=",
        "contains", "startswith", "in", "not in", "is empty", "is not empty"
    ];

    public static IReadOnlyList<string> Fields { get; } =
        BomLineFieldCatalog.Keys.Concat([LevelField, HasChildrenField]).OrderBy(k => k).ToList();

    private static readonly Regex ComparisonRegex = new(
        @"^\s*(?<field>[A-Za-z0-9_]+)\s*(?<op>is\s+not\s+empty|is\s+empty|not\s+in\b|in\b|startswith\b|contains\b|>=|<=|<>|!=|=|>|<)\s*(?<value>.*?)\s*$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static bool Matches(ValidationContext context, BomLine line, string? expression)
    {
        if (string.IsNullOrWhiteSpace(expression)) return true;
        try
        {
            return EvaluateOr(context, line, expression);
        }
        catch (FormatException)
        {
            // Expressions are checked when the rule is saved, so this only guards corrupt data.
            return false;
        }
    }

    /// <summary>Throws <see cref="FormatException"/> when the expression cannot be parsed.</summary>
    public static void Validate(string? expression)
    {
        if (string.IsNullOrWhiteSpace(expression)) return;
        foreach (var comparison in SplitOn(expression, " or ").SelectMany(part => SplitOn(part, " and ")))
            ParseComparison(comparison);
    }

    private static bool EvaluateOr(ValidationContext context, BomLine line, string expression) =>
        SplitOn(expression, " or ").Any(part => EvaluateAnd(context, line, part));

    private static bool EvaluateAnd(ValidationContext context, BomLine line, string expression) =>
        SplitOn(expression, " and ").All(part => EvaluateComparison(context, line, part));

    private static IEnumerable<string> SplitOn(string expression, string keyword) =>
        Regex.Split(expression, Regex.Escape(keyword), RegexOptions.IgnoreCase)
            .Where(part => !string.IsNullOrWhiteSpace(part));

    private static (string Field, string Op, string Value) ParseComparison(string comparison)
    {
        var match = ComparisonRegex.Match(comparison);
        if (!match.Success)
            throw new FormatException($"'{comparison.Trim()}' is not a valid condition.");

        var field = match.Groups["field"].Value;
        if (!Fields.Contains(field, StringComparer.OrdinalIgnoreCase))
            throw new FormatException($"'{field}' is not a BOM line field.");

        var op = Regex.Replace(match.Groups["op"].Value, @"\s+", " ").ToLowerInvariant();
        return (field, op, match.Groups["value"].Value);
    }

    private static bool EvaluateComparison(ValidationContext context, BomLine line, string comparison)
    {
        var (field, op, rawValue) = ParseComparison(comparison);
        var actual = ReadField(context, line, field) ?? string.Empty;

        return op switch
        {
            "is empty" => string.IsNullOrWhiteSpace(actual),
            "is not empty" => !string.IsNullOrWhiteSpace(actual),
            "=" => Same(actual, Unquote(rawValue)),
            "!=" or "<>" => !Same(actual, Unquote(rawValue)),
            "contains" => actual.Contains(Unquote(rawValue), StringComparison.OrdinalIgnoreCase),
            "startswith" => actual.StartsWith(Unquote(rawValue), StringComparison.OrdinalIgnoreCase),
            "in" => ParseList(rawValue).Any(v => Same(actual, v)),
            "not in" => !ParseList(rawValue).Any(v => Same(actual, v)),
            _ => CompareNumbers(actual, rawValue, op)
        };
    }

    private static string? ReadField(ValidationContext context, BomLine line, string field)
    {
        if (string.Equals(field, LevelField, StringComparison.OrdinalIgnoreCase))
            return context.LevelOf(line).ToString(CultureInfo.InvariantCulture);
        if (string.Equals(field, HasChildrenField, StringComparison.OrdinalIgnoreCase))
            return context.ChildrenByParent[line.Id].Any() ? "true" : "false";
        return BomLineFieldCatalog.TryRead(line, field, out var value) ? value : null;
    }

    private static bool Same(string actual, string expected) =>
        string.Equals(actual.Trim(), expected, StringComparison.OrdinalIgnoreCase);

    private static string Unquote(string value)
    {
        var trimmed = value.Trim();
        return trimmed.Length >= 2 && (trimmed[0] == '\'' || trimmed[0] == '"') && trimmed[^1] == trimmed[0]
            ? trimmed[1..^1]
            : trimmed;
    }

    private static IEnumerable<string> ParseList(string value) =>
        value.Trim().Trim('(', ')')
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Unquote);

    private static bool CompareNumbers(string actual, string rawValue, string op)
    {
        if (!decimal.TryParse(actual, NumberStyles.Any, CultureInfo.InvariantCulture, out var left) ||
            !decimal.TryParse(Unquote(rawValue), NumberStyles.Any, CultureInfo.InvariantCulture, out var right))
            return false;

        return op switch
        {
            ">" => left > right,
            ">=" => left >= right,
            "<" => left < right,
            "<=" => left <= right,
            _ => false
        };
    }
}
