using System.Text.RegularExpressions;
using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Api.Csv;

/// <summary>A flat BOM field an imported CSV column can be mapped onto.</summary>
public sealed record BomImportField(string Key, bool Required, string[] Aliases);

/// <summary>
/// Catalog of the flat fields the user maps to source columns during import. Hierarchy comes
/// either from a single mapped <see cref="DepthKey"/> column (a numeric level per row) or, when
/// that is not mapped, from the level1..level8 columns detected by header.
/// </summary>
public static class BomImportFields
{
    /// <summary>Key of the optional single numeric level/depth column that drives the hierarchy.</summary>
    public const string DepthKey = "depth";

    public static readonly IReadOnlyList<BomImportField> All =
    [
        new("action", false, ["action"]),
        new(DepthKey, false, ["level", "depth", "bomlevel", "levelnumber", "levelno"]),
        new("position", false, ["position", "pos"]),
        new("bsObjectId", true, ["bsobjectid", "objectid", "bsobject"]),
        new("legacySwingId", false, ["legacyswingid", "swingid", "swingitemnumber"]),
        new("drawingNo", false, ["drawingno", "drawingnumber", "drawing"]),
        new("description", true, ["description", "desc", "name"]),
        new("finalQuantity", true, ["finalquantity", "quantity", "qty", "finalqty"]),
        new("constant", false, ["constant"]),
        new("class", true, ["class"]),
        new("uom", false, ["uom", "unitofmeasure", "unit"]),
        new("isEbom", false, ["isebom", "ebom"]),
        new("phantom", false, ["phantom", "childfixed"]),
        new("releaseTemplate", false, ["releasetemplate", "dynamicsitemtemplate"]),
        new("conditions", false, ["conditions", "condition", "econvariables"]),
        new("formula", false, ["formula", "formulas"]),
        new("route", false, ["route"]),
        new("bomExplosion", false, ["bomexplosion", "explosion"]),
        new("noOfPiecesInPack", false, ["noofpiecesinpack", "piecesinpack", "piecesperpack", "piecespack"]),
        new("weightKg", false, ["weightinkg", "weightkg", "weight"]),
        new("volumeM3", false, ["volumeinm3", "volumem3", "volume"]),
    ];

    private static readonly Regex LevelHeaderRegex = new("^level([1-8])$", RegexOptions.Compiled);

    /// <summary>Normalise a header/alias to letters and digits only, lower-cased, for matching.</summary>
    public static string Normalize(string value) =>
        new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

    public static IReadOnlyList<ImportFieldDto> ToDtos() =>
        All.Select(f => new ImportFieldDto(f.Key, f.Required)).ToList();

    /// <summary>Best-guess field.key -&gt; source column index using normalized header aliases.</summary>
    public static IReadOnlyDictionary<string, int> SuggestMapping(string[] headers)
    {
        var normalized = headers.Select(Normalize).ToArray();
        var map = new Dictionary<string, int>();
        foreach (var field in All)
        {
            for (var i = 0; i < normalized.Length; i++)
            {
                if (field.Aliases.Contains(normalized[i]))
                {
                    map[field.Key] = i;
                    break;
                }
            }
        }
        return map;
    }

    /// <summary>Detect the level1..level8 columns; returns depth (1..8) -&gt; column index, ascending by depth.</summary>
    public static IReadOnlyList<(int Depth, int Index)> LevelColumns(string[] headers)
    {
        var result = new List<(int Depth, int Index)>();
        for (var i = 0; i < headers.Length; i++)
        {
            var match = LevelHeaderRegex.Match(Normalize(headers[i]));
            if (match.Success)
                result.Add((int.Parse(match.Groups[1].Value), i));
        }
        return result.OrderBy(x => x.Depth).ToList();
    }
}
