using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>Owns validation and persistence for the admin-managed Release Template lookup values.</summary>
public interface IReleaseTemplateService
{
    Task<IReadOnlyList<ReleaseTemplateDto>> GetAllAsync(CancellationToken ct = default);
    Task<ReleaseTemplateDto> CreateAsync(CreateReleaseTemplateRequest request, CancellationToken ct = default);
    Task<ReleaseTemplateDto> UpdateAsync(Guid id, UpdateReleaseTemplateRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
