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
/// Parses an mBOM CSV into a new BOM document. The tree is reconstructed from the level1-8
/// columns: exactly one level column per data row holds a value and its column index is the depth.
/// </summary>
public class CsvImportService(AppDbContext db) : ICsvImportService
{
    public async Task<ImportInspectResult> InspectAsync(Stream csv, CancellationToken ct = default)
    {
        var config = CreateCsvConfiguration();

        using var reader = new StreamReader(csv);
        using var parser = new CsvParser(reader, config);

        if (!await parser.ReadAsync() || parser.Record is null)
            throw new InvalidOperationException("CSV file is empty.");

        var headers = parser.Record;
        var columns = headers
            .Select((header, index) => new ImportColumnDto(index, header))
            .ToList();

        var sampleRows = new List<IReadOnlyList<string>>();
        for (var i = 0; i < 5 && await parser.ReadAsync(); i++)
        {
            sampleRows.Add((parser.Record ?? Array.Empty<string>()).ToArray());
        }

        return new ImportInspectResult(
            columns,
            BomImportFields.ToDtos(),
            BomImportFields.SuggestMapping(headers),
            sampleRows);
    }

    public async Task<BomDocumentSummaryDto> ImportAsync(
        Stream csv, string fileName, string documentName, BomImportMapping mapping, UserContext user, CancellationToken ct = default)
    {
        if (mapping.Fields is null)
            throw new InvalidOperationException("A column mapping is required.");

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

        var config = CreateCsvConfiguration();

        using var reader = new StreamReader(csv);
        using var parser = new CsvParser(reader, config);

        if (!await parser.ReadAsync() || parser.Record is null)
            throw new InvalidOperationException("CSV file is empty.");

        var headers = parser.Record;
        var levelColumns = BomImportFields.LevelColumns(headers);
        EnsureMappingIsValid(mapping.Fields, levelColumns.Count > 0);

        var lastAtDepth = new Dictionary<int, BomLine>();
        var siblingCounter = new Dictionary<Guid, int>(); // parentId -> next sort order
        var rootCounter = 0;
        var lines = new List<BomLine>();

        while (await parser.ReadAsync())
        {
            var record = parser.Record;
            if (record is null) continue;

            var depth = ResolveDepth(record, mapping.Fields, levelColumns);
            if (depth == 0) continue; // fully empty / non-structural row

            lastAtDepth.TryGetValue(depth - 1, out var parent);

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
                Action = ParseAction(Field(record, mapping.Fields, "action")),
                Position = Field(record, mapping.Fields, "position"),
                BsObjectId = Field(record, mapping.Fields, "bsObjectId"),
                LegacySwingId = Field(record, mapping.Fields, "legacySwingId"),
                DrawingNo = Field(record, mapping.Fields, "drawingNo"),
                Description = Field(record, mapping.Fields, "description"),
                FinalQuantity = Field(record, mapping.Fields, "finalQuantity"),
                Constant = Field(record, mapping.Fields, "constant"),
                Class = Field(record, mapping.Fields, "class"),
                Uom = Field(record, mapping.Fields, "uom"),
                IsEbom = ParseYesNo(Field(record, mapping.Fields, "isEbom")),
                Phantom = ParseYesNo(Field(record, mapping.Fields, "phantom")),
                ReleaseTemplate = Field(record, mapping.Fields, "releaseTemplate"),
                Conditions = Field(record, mapping.Fields, "conditions"),
                Formula = Field(record, mapping.Fields, "formula"),
                Route = Field(record, mapping.Fields, "route"),
                BomExplosion = Field(record, mapping.Fields, "bomExplosion"),
                NoOfPiecesInPack = Field(record, mapping.Fields, "noOfPiecesInPack"),
                WeightKg = Field(record, mapping.Fields, "weightKg"),
                VolumeM3 = Field(record, mapping.Fields, "volumeM3")
            };

            lines.Add(line);
            lastAtDepth[depth] = line;
            // Reset deeper markers so a shallower row cannot inherit a stale deep parent.
            var deeperKeys = lastAtDepth.Keys.Where(d => d > depth).ToList();
            foreach (var deeperKey in deeperKeys)
                lastAtDepth.Remove(deeperKey);
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

    private static CsvConfiguration CreateCsvConfiguration() => new(CultureInfo.InvariantCulture)
    {
        HasHeaderRecord = true,
        MissingFieldFound = null,
        BadDataFound = null,
        TrimOptions = TrimOptions.Trim
    };

    /// <summary>Depth = index (1..8) of the first non-empty level column, or 0 if none.</summary>
    private static int ResolveDepth(
        string[] record,
        IReadOnlyDictionary<string, int> mapping,
        IReadOnlyList<(int Depth, int Index)> levelColumns)
    {
        if (mapping.TryGetValue(BomImportFields.DepthKey, out var depthIndex))
        {
            var depthValue = Field(record, depthIndex);
            return int.TryParse(depthValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var depth) && depth > 0
                ? depth
                : 0;
        }

        foreach (var (depth, index) in levelColumns)
        {
            if (index < record.Length && !string.IsNullOrWhiteSpace(record[index]))
                return depth;
        }

        return 0;
    }

    private static void EnsureMappingIsValid(IReadOnlyDictionary<string, int> mapping, bool hasLevelColumns)
    {
        foreach (var field in BomImportFields.All.Where(field => field.Required))
        {
            if (!mapping.ContainsKey(field.Key))
                throw new InvalidOperationException($"Missing required mapping for '{field.Key}'.");
        }

        if (!mapping.ContainsKey(BomImportFields.DepthKey) && !hasLevelColumns)
            throw new InvalidOperationException("Map a depth column or provide level1..level8 columns.");
    }

    private static string? Field(string[] record, IReadOnlyDictionary<string, int> mapping, string key)
    {
        if (!mapping.TryGetValue(key, out var index)) return null;
        return Field(record, index);
    }

    private static string? Field(string[] record, int index)
    {
        if (index >= record.Length) return null;
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
