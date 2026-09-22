using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using Haworth.BOMeditor.Api.Csv;
using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

/// <summary>
/// Rebuilds the original mBOM CSV layout from the stored tree. Level columns are re-derived
/// from tree depth; multi-line Conditions/Formula are re-quoted verbatim by CsvHelper.
/// </summary>
public class CsvExportService(AppDbContext db) : ICsvExportService
{
    public async Task<byte[]?> ExportAsync(Guid documentId, CancellationToken ct = default)
    {
        var exists = await db.BomDocuments.AnyAsync(d => d.Id == documentId, ct);
        if (!exists) return null;

        var lines = await db.BomLines
            .Where(l => l.BomDocumentId == documentId)
            .ToListAsync(ct);

        var childrenByParent = lines
            .OrderBy(l => l.SortOrder)
            .ToLookup(l => l.ParentId);

        using var buffer = new MemoryStream();
        using (var writer = new StreamWriter(buffer, new UTF8Encoding(false), leaveOpen: true))
        using (var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)))
        {
            foreach (var header in BomCsvColumns.Header)
                csv.WriteField(header);
            await csv.NextRecordAsync();

            foreach (var (line, depth) in EnumeratePreOrder(childrenByParent, null, 1))
            {
                WriteRow(csv, line, depth);
                await csv.NextRecordAsync();
            }
        }

        return buffer.ToArray();
    }

    private static IEnumerable<(BomLine Line, int Depth)> EnumeratePreOrder(
        ILookup<Guid?, BomLine> childrenByParent, Guid? parentId, int depth)
    {
        foreach (var child in childrenByParent[parentId])
        {
            yield return (child, depth);
            foreach (var descendant in EnumeratePreOrder(childrenByParent, child.Id, depth + 1))
                yield return descendant;
        }
    }

    private static void WriteRow(CsvWriter csv, BomLine line, int depth)
    {
        csv.WriteField(ActionText(line.Action));
        for (var d = 1; d <= BomCsvColumns.LevelLast; d++)
            csv.WriteField(d == depth ? depth.ToString(CultureInfo.InvariantCulture) : string.Empty);

        csv.WriteField(line.Position ?? string.Empty);
        csv.WriteField(line.BsObjectId ?? string.Empty);
        csv.WriteField(line.LegacySwingId ?? string.Empty);
        csv.WriteField(line.DrawingNo ?? string.Empty);
        csv.WriteField(line.Description ?? string.Empty);
        csv.WriteField(line.FinalQuantity ?? string.Empty);
        csv.WriteField(line.Constant ?? string.Empty);
        csv.WriteField(line.Class ?? string.Empty);
        csv.WriteField(line.Uom ?? string.Empty);
        csv.WriteField(line.IsEbom ? "YES" : "NO");
        csv.WriteField(line.Phantom ? "YES" : "NO");
        csv.WriteField(line.ReleaseTemplate ?? string.Empty);
        csv.WriteField(line.Conditions ?? string.Empty);
        csv.WriteField(line.Formula ?? string.Empty);
        csv.WriteField(line.Route ?? string.Empty);
        csv.WriteField(line.BomExplosion ?? string.Empty);
        csv.WriteField(line.NoOfPiecesInPack ?? string.Empty);
        csv.WriteField(line.WeightKg ?? string.Empty);
        csv.WriteField(line.VolumeM3 ?? string.Empty);
    }

    private static string ActionText(BomAction action) => action switch
    {
        BomAction.Add => "ADD",
        BomAction.Delete => "DELETE",
        _ => "KEEP"
    };
}
