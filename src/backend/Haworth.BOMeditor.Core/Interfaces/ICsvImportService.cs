using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

public interface ICsvImportService
{
    /// <summary>Inspect a CSV upload to return its columns, sample rows, and suggested field mapping.</summary>
    Task<ImportInspectResult> InspectAsync(Stream csv, CancellationToken ct = default);

    /// <summary>Parse an mBOM CSV stream into a new BOM document, building the line tree from level columns.</summary>
    Task<BomDocumentSummaryDto> ImportAsync(
        Stream csv,
        string fileName,
        string documentName,
        BomImportMapping mapping,
        UserContext user,
        CancellationToken ct = default);
}
