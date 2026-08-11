using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>
/// Owns validation and orchestration for administering user accounts and their role assignments.
/// </summary>
public interface IUserService
{
    Task<IReadOnlyList<UserSummaryDto>> GetUsersAsync(CancellationToken ct = default);
    Task<UserSummaryDto> CreateUserAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<UserSummaryDto> UpdateRolesAsync(Guid userId, UpdateUserRolesRequest request, Guid currentUserId, CancellationToken ct = default);
    Task<UserSummaryDto> SetEnabledAsync(Guid userId, bool enabled, Guid currentUserId, CancellationToken ct = default);
    Task ResetPasswordAsync(Guid userId, ResetPasswordRequest request, CancellationToken ct = default);
    Task DeleteUserAsync(Guid userId, Guid currentUserId, CancellationToken ct = default);
}
