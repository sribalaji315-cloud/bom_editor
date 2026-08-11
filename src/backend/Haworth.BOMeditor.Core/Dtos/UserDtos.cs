namespace Haworth.BOMeditor.Core.Dtos;

/// <summary>A user account with its assigned roles and enabled state.</summary>
public record UserSummaryDto(
    Guid Id,
    string Email,
    string? DisplayName,
    bool IsEnabled,
    IReadOnlyList<string> Roles);

public record CreateUserRequest(
    string Email,
    string? DisplayName,
    string Password,
    IReadOnlyList<string> Roles);

public record UpdateUserRolesRequest(IReadOnlyList<string> Roles);

public record SetUserEnabledRequest(bool Enabled);

public record ResetPasswordRequest(string NewPassword);
