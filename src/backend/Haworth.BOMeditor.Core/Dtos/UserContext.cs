namespace Haworth.BOMeditor.Core.Dtos;

/// <summary>Identity of the acting user, used for audit stamping and workflow role checks.</summary>
public record UserContext(string? UserId, string? UserName, IReadOnlyList<string>? Roles = null)
{
    public bool IsInRole(params string[] roles) =>
        Roles is not null && roles.Any(r => Roles.Contains(r, StringComparer.OrdinalIgnoreCase));
}
