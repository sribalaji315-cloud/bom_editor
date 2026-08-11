namespace Haworth.BOMeditor.Core.Dtos;

/// <summary>Identity of the acting user, used for audit stamping.</summary>
public record UserContext(string? UserId, string? UserName);
