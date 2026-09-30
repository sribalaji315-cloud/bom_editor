using Haworth.BOMeditor.Core.Domain;

namespace Haworth.BOMeditor.Core.Validation;

/// <summary>Read-only accessors for the BOM line fields a validation rule can target or filter on.</summary>
public static class BomLineFieldCatalog
{
    private static readonly Dictionary<string, Func<BomLine, string?>> Accessors =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["action"] = l => l.Action.ToString(),
            ["position"] = l => l.Position,
            ["bsObjectId"] = l => l.BsObjectId,
            ["legacySwingId"] = l => l.LegacySwingId,
            ["drawingNo"] = l => l.DrawingNo,
            ["description"] = l => l.Description,
            ["finalQuantity"] = l => l.FinalQuantity,
            ["constant"] = l => l.Constant,
            ["class"] = l => l.Class,
            ["uom"] = l => l.Uom,
            ["isEbom"] = l => l.IsEbom ? "true" : "false",
            ["phantom"] = l => l.Phantom ? "true" : "false",
            ["releaseTemplate"] = l => l.ReleaseTemplate,
            ["conditions"] = l => l.Conditions,
            ["conditionsPlm"] = l => l.ConditionsPlm,
            ["formula"] = l => l.Formula,
            ["formulaPlm"] = l => l.FormulaPlm,
            ["route"] = l => l.Route,
            ["bomExplosion"] = l => l.BomExplosion,
            ["noOfPiecesInPack"] = l => l.NoOfPiecesInPack,
            ["weightKg"] = l => l.WeightKg,
            ["volumeM3"] = l => l.VolumeM3
        };

    public static IReadOnlyList<string> Keys { get; } = Accessors.Keys.OrderBy(k => k).ToList();

    public static bool TryRead(BomLine line, string? field, out string? value)
    {
        value = null;
        if (field is null || !Accessors.TryGetValue(field, out var accessor)) return false;
        value = accessor(line);
        return true;
    }
}
