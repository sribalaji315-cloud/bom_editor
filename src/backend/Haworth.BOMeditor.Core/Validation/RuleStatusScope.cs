using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Validation;

/// <summary>
/// Reads and writes a rule's document-status scope, stored as a comma-separated list of
/// <see cref="BomDocumentStatus"/> names. An empty scope means the rule runs in every status.
/// </summary>
public static class RuleStatusScope
{
    public static IReadOnlyList<string> Statuses { get; } = Enum.GetNames<BomDocumentStatus>();

    public static bool Includes(string? scope, BomDocumentStatus status)
    {
        if (string.IsNullOrWhiteSpace(scope)) return true;
        foreach (var token in Split(scope))
        {
            if (Enum.TryParse<BomDocumentStatus>(token, ignoreCase: true, out var parsed) && parsed == status)
                return true;
        }
        return false;
    }

    public static IReadOnlyList<string> Split(string? scope) =>
        string.IsNullOrWhiteSpace(scope)
            ? []
            : scope.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    /// <summary>Validates and canonicalises the selection; returns null when it covers every status.</summary>
    public static string? Normalize(IEnumerable<string>? values)
    {
        if (values is null) return null;

        var parsed = new List<BomDocumentStatus>();
        foreach (var value in values)
        {
            if (string.IsNullOrWhiteSpace(value)) continue;
            if (!Enum.TryParse<BomDocumentStatus>(value.Trim(), ignoreCase: true, out var status))
                throw new FormatException($"'{value.Trim()}' is not a BOM status.");
            if (!parsed.Contains(status)) parsed.Add(status);
        }

        return parsed.Count == 0
            ? null
            : string.Join(",", parsed.OrderBy(s => s).Select(s => s.ToString()));
    }
}
