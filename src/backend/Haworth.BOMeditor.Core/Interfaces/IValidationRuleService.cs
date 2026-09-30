using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>Admin maintenance of the validation rule catalog.</summary>
public interface IValidationRuleService
{
    Task<IReadOnlyList<ValidationRuleDto>> GetAllAsync(CancellationToken ct = default);
    Task<ValidationRuleDto> CreateAsync(CreateValidationRuleRequest request, CancellationToken ct = default);
    Task<ValidationRuleDto> UpdateAsync(Guid id, UpdateValidationRuleRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    ValidationMetadataDto GetMetadata();
}
