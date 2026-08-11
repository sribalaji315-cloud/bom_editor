namespace Haworth.BOMeditor.Api.Auth;

public record LoginRequest(string Email, string Password);

public record AuthUserDto(Guid Id, string Email, string? DisplayName, IReadOnlyList<string> Roles);

public record LoginResponse(string Token, DateTimeOffset ExpiresAt, AuthUserDto User);
