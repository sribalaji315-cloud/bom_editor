using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

public class UserService(UserManager<AppUser> userManager) : IUserService
{
    // A far-future lockout end marks an account as disabled; login is blocked while active.
    private static readonly DateTimeOffset DisabledUntil = DateTimeOffset.MaxValue;

    public async Task<IReadOnlyList<UserSummaryDto>> GetUsersAsync(CancellationToken ct = default)
    {
        var users = await userManager.Users.OrderBy(u => u.Email).ToListAsync(ct);
        var result = new List<UserSummaryDto>(users.Count);
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            result.Add(ToDto(user, roles));
        }
        return result;
    }

    public async Task<UserSummaryDto> CreateUserAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var email = request.Email?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException("Email is required.");
        if (string.IsNullOrEmpty(request.Password))
            throw new InvalidOperationException("Password is required.");

        var roles = NormalizeRoles(request.Roles);
        if (await userManager.FindByEmailAsync(email) is not null)
            throw new InvalidOperationException("A user with this email already exists.");

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim()
        };

        var created = await userManager.CreateAsync(user, request.Password);
        ThrowIfFailed(created);

        if (roles.Count > 0)
            ThrowIfFailed(await userManager.AddToRolesAsync(user, roles));

        return ToDto(user, roles);
    }

    public async Task<UserSummaryDto> UpdateRolesAsync(
        Guid userId, UpdateUserRolesRequest request, Guid currentUserId, CancellationToken ct = default)
    {
        var user = await FindRequiredAsync(userId);
        var desired = NormalizeRoles(request.Roles);
        var current = await userManager.GetRolesAsync(user);

        var removing = current.Except(desired, StringComparer.OrdinalIgnoreCase).ToList();
        var adding = desired.Except(current, StringComparer.OrdinalIgnoreCase).ToList();

        if (removing.Contains(AppRole.Admin, StringComparer.OrdinalIgnoreCase))
        {
            if (userId == currentUserId)
                throw new InvalidOperationException("You cannot remove the Admin role from your own account.");
            await EnsureNotLastAdminAsync(userId);
        }

        if (removing.Count > 0)
            ThrowIfFailed(await userManager.RemoveFromRolesAsync(user, removing));
        if (adding.Count > 0)
            ThrowIfFailed(await userManager.AddToRolesAsync(user, adding));

        return ToDto(user, desired);
    }

    public async Task<UserSummaryDto> SetEnabledAsync(
        Guid userId, bool enabled, Guid currentUserId, CancellationToken ct = default)
    {
        var user = await FindRequiredAsync(userId);

        if (!enabled)
        {
            if (userId == currentUserId)
                throw new InvalidOperationException("You cannot disable your own account.");
            if (await userManager.IsInRoleAsync(user, AppRole.Admin))
                await EnsureNotLastAdminAsync(userId);
        }

        ThrowIfFailed(await userManager.SetLockoutEnabledAsync(user, enabled));
        ThrowIfFailed(await userManager.SetLockoutEndDateAsync(user, enabled ? null : DisabledUntil));

        var roles = await userManager.GetRolesAsync(user);
        return ToDto(user, roles);
    }

    public async Task ResetPasswordAsync(Guid userId, ResetPasswordRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(request.NewPassword))
            throw new InvalidOperationException("A new password is required.");

        var user = await FindRequiredAsync(userId);
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        ThrowIfFailed(await userManager.ResetPasswordAsync(user, token, request.NewPassword));
    }

    public async Task DeleteUserAsync(Guid userId, Guid currentUserId, CancellationToken ct = default)
    {
        var user = await FindRequiredAsync(userId);

        if (userId == currentUserId)
            throw new InvalidOperationException("You cannot delete your own account.");
        if (await userManager.IsInRoleAsync(user, AppRole.Admin))
            await EnsureNotLastAdminAsync(userId);

        ThrowIfFailed(await userManager.DeleteAsync(user));
    }

    private async Task<AppUser> FindRequiredAsync(Guid userId) =>
        await userManager.FindByIdAsync(userId.ToString())
        ?? throw new KeyNotFoundException("User not found.");

    private async Task EnsureNotLastAdminAsync(Guid excludingUserId)
    {
        var admins = await userManager.GetUsersInRoleAsync(AppRole.Admin);
        if (!admins.Any(a => a.Id != excludingUserId))
            throw new InvalidOperationException("At least one Admin account must remain.");
    }

    private static List<string> NormalizeRoles(IReadOnlyList<string>? roles)
    {
        if (roles is null)
            return [];

        var normalized = new List<string>();
        foreach (var role in roles)
        {
            var match = AppRole.All.FirstOrDefault(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase));
            if (match is null)
                throw new InvalidOperationException($"Unknown role: {role}.");
            if (!normalized.Contains(match))
                normalized.Add(match);
        }
        return normalized;
    }

    private static bool IsEnabled(AppUser user) =>
        user.LockoutEnd is null || user.LockoutEnd <= DateTimeOffset.UtcNow;

    private static UserSummaryDto ToDto(AppUser user, IEnumerable<string> roles) =>
        new(user.Id, user.Email ?? string.Empty, user.DisplayName, IsEnabled(user), roles.ToList());

    private static void ThrowIfFailed(IdentityResult result)
    {
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join(" ", result.Errors.Select(e => e.Description)));
    }
}
