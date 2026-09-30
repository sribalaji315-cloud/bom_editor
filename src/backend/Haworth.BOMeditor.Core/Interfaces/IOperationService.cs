using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>Owns validation and persistence for the operation master data and its request queue.</summary>
public interface IOperationService
{
    Task<IReadOnlyList<OperationDto>> GetAllAsync(CancellationToken ct = default);

    /// <summary>Approved and active operations only — what the route picker offers.</summary>
    Task<IReadOnlyList<OperationOptionDto>> GetSelectableAsync(CancellationToken ct = default);

    Task<OperationDto> CreateAsync(CreateOperationRequest request, CancellationToken ct = default);
    Task<OperationDto> RequestAsync(RequestOperationRequest request, UserContext user, CancellationToken ct = default);
    Task<OperationDto> UpdateAsync(Guid id, UpdateOperationRequest request, CancellationToken ct = default);
    Task<OperationDto> ApproveAsync(Guid id, ReviewOperationRequest request, UserContext user, CancellationToken ct = default);
    Task<OperationDto> RejectAsync(Guid id, UserContext user, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
