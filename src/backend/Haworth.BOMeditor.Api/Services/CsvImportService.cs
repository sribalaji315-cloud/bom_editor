using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using Haworth.BOMeditor.Api.Csv;
using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;

namespace Haworth.BOMeditor.Api.Services;

/// <summary>
/// Parses an mBOM CSV into a new BOM document. Flat fields are read from user-mapped source
/// columns; the tree is reconstructed from the level1..level8 columns detected by header
/// (exactly one level column per data row holds a value and its number is the depth).
/// </summary>
public class CsvImportService(AppDbContext db) : ICsvImportService
{
    private static CsvConfiguration Config => new(CultureInfo.InvariantCulture)
    {
        HasHeaderRecord = true,
        MissingFieldFound = null,
        BadDataFound = null,
        TrimOptions = TrimOptions.Trim
    };

    public async Task<ImportInspectResult> InspectAsync(Stream csv, CancellationToken ct = default)
    {
        using var reader = new StreamReader(csv);
        using var parser = new CsvParser(reader, Config);

        if (!await parser.ReadAsync() || parser.Record is null)
            throw new InvalidOperationException("The CSV file has no header row.");

        var headers = parser.Record;
        var columns = headers.Select((h, i) => new ImportColumnDto(i, h)).ToList();
        var suggested = BomImportFields.SuggestMapping(headers);

        var sampleRows = new List<IReadOnlyList<string>>();
        while (sampleRows.Count < 5 && await parser.ReadAsync())
        {
            if (parser.Record is { } row) sampleRows.Add(row.ToList());
        }

        return new ImportInspectResult(columns, BomImportFields.ToDtos(), suggested, sampleRows);
    }

    public async Task<BomDocumentSummaryDto> ImportAsync(
        Stream csv, string fileName, string documentName,
        IReadOnlyDictionary<string, int> mapping, UserContext user, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var document = new BomDocument
        {
            Id = Guid.NewGuid(),
            Name = string.IsNullOrWhiteSpace(documentName) ? fileName : documentName,
            SourceFileName = fileName,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedBy = user.UserName
        };

        using var reader = new StreamReader(csv);
        using var parser = new CsvParser(reader, Config);

        if (!await parser.ReadAsync() || parser.Record is null)
            throw new InvalidOperationException("The CSV file has no header row.");

        var levelColumns = BomImportFields.LevelColumns(parser.Record);
        var hasDepthColumn = mapping.TryGetValue(BomImportFields.DepthKey, out var depthColumn);
        if (levelColumns.Count == 0 && !hasDepthColumn)
            throw new InvalidOperationException(
                "No hierarchy found. Map a Level/Depth column, or use a file with level1..level8 columns.");

        // lastAtDepth[d] is the most recent line created at depth d (1-based), used to find parents.
        var lastAtDepth = new Dictionary<int, BomLine>();
        var siblingCounter = new Dictionary<Guid, int>(); // parentId -> next sort order
        var rootCounter = 0;
        var lines = new List<BomLine>();

        while (await parser.ReadAsync())
        {
            var record = parser.Record;
            if (record is null) continue;

            var depth = hasDepthColumn
                ? ParseDepth(record, depthColumn)
                : ResolveDepth(record, levelColumns);
            if (depth <= 0) continue; // fully empty / non-structural row

            var parent = depth > 1 && lastAtDepth.TryGetValue(depth - 1, out var ancestor) ? ancestor : null;

            int sortOrder;
            if (parent is null)
            {
                sortOrder = rootCounter++;
            }
            else
            {
                siblingCounter.TryGetValue(parent.Id, out var n);
                sortOrder = n;
                siblingCounter[parent.Id] = n + 1;
            }

            var line = new BomLine
            {
                Id = Guid.NewGuid(),
                BomDocumentId = document.Id,
                ParentId = parent?.Id,
                SortOrder = sortOrder,
                Action = ParseAction(Mapped(record, mapping, "action")),
                Position = Mapped(record, mapping, "position"),
                BsObjectId = Mapped(record, mapping, "bsObjectId"),
                LegacySwingId = Mapped(record, mapping, "legacySwingId"),
                DrawingNo = Mapped(record, mapping, "drawingNo"),
                Description = Mapped(record, mapping, "description"),
                FinalQuantity = Mapped(record, mapping, "finalQuantity"),
                Constant = Mapped(record, mapping, "constant"),
                Class = Mapped(record, mapping, "class"),
                Uom = Mapped(record, mapping, "uom"),
                IsEbom = ParseYesNo(Mapped(record, mapping, "isEbom")),
                Phantom = ParseYesNo(Mapped(record, mapping, "phantom")),
                ReleaseTemplate = Mapped(record, mapping, "releaseTemplate"),
                Conditions = Mapped(record, mapping, "conditions"),
                Formula = Mapped(record, mapping, "formula"),
                Route = Mapped(record, mapping, "route"),
                BomExplosion = Mapped(record, mapping, "bomExplosion"),
                NoOfPiecesInPack = Mapped(record, mapping, "noOfPiecesInPack"),
                WeightKg = Mapped(record, mapping, "weightKg"),
                VolumeM3 = Mapped(record, mapping, "volumeM3")
            };

            lines.Add(line);
            lastAtDepth[depth] = line;
            // Drop any deeper markers so a shallower row cannot inherit a stale deep parent.
            foreach (var d in lastAtDepth.Keys.Where(k => k > depth).ToList())
                lastAtDepth.Remove(d);
        }

        document.Lines = lines;
        db.BomDocuments.Add(document);

        db.BomAuditEntries.Add(new BomAuditEntry
        {
            Id = Guid.NewGuid(),
            BomDocumentId = document.Id,
            Timestamp = now,
            UserId = user.UserId,
            UserName = user.UserName,
            ChangeType = AuditChangeType.Create,
            FieldName = "Import",
            NewValue = $"{fileName} ({lines.Count} lines)"
        });

        await db.SaveChangesAsync(ct);

        return new BomDocumentSummaryDto(
            document.Id, document.Name, document.SourceFileName, lines.Count,
            document.CreatedAt, document.CreatedBy, document.UpdatedAt);
    }

    /// <summary>Depth = number of the first level column (ascending) that holds a value, or 0.</summary>
    private static int ResolveDepth(string[] record, IReadOnlyList<(int Depth, int Index)> levelColumns)
    {
        foreach (var (depth, index) in levelColumns)
        {
            if (index < record.Length && !string.IsNullOrWhiteSpace(record[index]))
                return depth;
        }
        return 0;
    }

    /// <summary>Depth read from a single numeric level column, or 0 if empty/non-numeric.</summary>
    private static int ParseDepth(string[] record, int index)
    {
        if (index < 0 || index >= record.Length) return 0;
        var value = record[index]?.Trim();
        if (string.IsNullOrEmpty(value)) return 0;
        if (int.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var d)) return d;
        if (double.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var dd)) return (int)dd;
        return 0;
    }

    /// <summary>Read the mapped source column for a field, or null if unmapped/empty/out of range.</summary>
    private static string? Mapped(string[] record, IReadOnlyDictionary<string, int> mapping, string fieldKey)
    {
        if (!mapping.TryGetValue(fieldKey, out var index) || index < 0 || index >= record.Length)
            return null;
        var value = record[index];
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static bool ParseYesNo(string? value) =>
        string.Equals(value?.Trim(), "YES", StringComparison.OrdinalIgnoreCase);

    private static BomAction ParseAction(string? value) => value?.Trim().ToUpperInvariant() switch
    {
        "ADD" => BomAction.Add,
        "DELETE" => BomAction.Delete,
        _ => BomAction.Keep
    };
}
