using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

public interface ICsvImportService
{
    /// <summary>Inspect a CSV: return its columns, mappable fields, a suggested mapping, and sample rows.</summary>
    Task<ImportInspectResult> InspectAsync(Stream csv, CancellationToken ct = default);

    /// <summary>
    /// Parse an mBOM CSV stream into a new BOM document using the supplied field-key -&gt; source
    /// column mapping. The tree is built from the level1..level8 columns detected by header.
    /// </summary>
    Task<BomDocumentSummaryDto> ImportAsync(Stream csv, string fileName, string documentName, IReadOnlyDictionary<string, int> mapping, UserContext user, CancellationToken ct = default);
}
