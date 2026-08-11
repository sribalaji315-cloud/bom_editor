using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>
/// Owns validation, persistence orchestration, and audit logging for BOM documents and lines.
/// </summary>
public interface IBomService
{
    Task<IReadOnlyList<BomDocumentSummaryDto>> GetDocumentsAsync(CancellationToken ct = default);
    Task<BomDocumentDetailDto?> GetDocumentAsync(Guid documentId, CancellationToken ct = default);
    Task<BomLineDto> CreateLineAsync(Guid documentId, CreateBomLineRequest request, UserContext user, CancellationToken ct = default);
    Task<BomLineDto?> UpdateLineAsync(Guid documentId, Guid lineId, UpdateBomLineRequest request, UserContext user, CancellationToken ct = default);
    Task<bool> DeleteLineAsync(Guid documentId, Guid lineId, UserContext user, CancellationToken ct = default);
    Task<bool> RestoreLineAsync(Guid documentId, Guid lineId, UserContext user, CancellationToken ct = default);
    Task<bool> PurgeLineAsync(Guid documentId, Guid lineId, UserContext user, CancellationToken ct = default);
    Task<bool> MoveLineAsync(Guid documentId, Guid lineId, MoveBomLineRequest request, UserContext user, CancellationToken ct = default);
    Task<bool> InsertBomAsync(Guid documentId, InsertBomRequest request, UserContext user, CancellationToken ct = default);
    Task<bool> DeleteDocumentAsync(Guid documentId, CancellationToken ct = default);
    Task<IReadOnlyList<BomAuditEntryDto>> GetAuditAsync(Guid documentId, CancellationToken ct = default);
}
