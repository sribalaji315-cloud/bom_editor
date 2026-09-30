using Haworth.BOMeditor.Core.Domain;

namespace Haworth.BOMeditor.Core.Validation;

/// <summary>
/// Everything the rule checks need for one document, prepared once by the validation service so no
/// check performs its own lookups.
/// </summary>
public sealed class ValidationContext
{
    public ValidationContext(
        IReadOnlyList<BomLine> lines,
        IEnumerable<string> activeReleaseTemplates,
        IEnumerable<string> activeRouteCodes)
    {
        Lines = lines;
        ChildrenByParent = lines.ToLookup(l => l.ParentId);
        ActiveReleaseTemplates = new HashSet<string>(activeReleaseTemplates, StringComparer.OrdinalIgnoreCase);
        ActiveRouteCodes = new HashSet<string>(activeRouteCodes, StringComparer.OrdinalIgnoreCase);
        LevelByLineId = ComputeLevels(lines);
    }

    /// <summary>Non-deleted lines of the document being validated.</summary>
    public IReadOnlyList<BomLine> Lines { get; }

    public ILookup<Guid?, BomLine> ChildrenByParent { get; }
    public IReadOnlyDictionary<Guid, int> LevelByLineId { get; }
    public IReadOnlySet<string> ActiveReleaseTemplates { get; }
    public IReadOnlySet<string> ActiveRouteCodes { get; }

    public int LevelOf(BomLine line) => LevelByLineId.TryGetValue(line.Id, out var level) ? level : 1;

    /// <summary>The lines a rule applies to, after its "applies when" expression is evaluated.</summary>
    public IEnumerable<BomLine> LinesFor(ValidationRule rule) =>
        string.IsNullOrWhiteSpace(rule.AppliesWhen)
            ? Lines
            : Lines.Where(l => RuleFilter.Matches(this, l, rule.AppliesWhen));

    private static Dictionary<Guid, int> ComputeLevels(IReadOnlyList<BomLine> lines)
    {
        var parents = lines.ToDictionary(l => l.Id, l => l.ParentId);
        var levels = new Dictionary<Guid, int>(lines.Count);
        foreach (var line in lines)
        {
            var level = 1;
            var current = line.ParentId;
            // Guard against a corrupt cycle so validation can still report the rest of the tree.
            while (current is Guid id && parents.TryGetValue(id, out var next) && level <= lines.Count)
            {
                level++;
                current = next;
            }
            levels[line.Id] = level;
        }
        return levels;
    }
}
