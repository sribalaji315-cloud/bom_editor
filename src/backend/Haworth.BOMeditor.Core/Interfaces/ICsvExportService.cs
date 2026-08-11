namespace Haworth.BOMeditor.Core.Interfaces;

public interface ICsvExportService
{
    /// <summary>Rebuild the original mBOM CSV column layout for a document. Returns null if not found.</summary>
    Task<byte[]?> ExportAsync(Guid documentId, CancellationToken ct = default);
}
