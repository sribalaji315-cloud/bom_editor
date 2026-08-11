using System.Security.Claims;
using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class UserContextExtensions
{
    public static UserContext ToUserContext(this ClaimsPrincipal principal) =>
        new(
            principal.FindFirstValue(ClaimTypes.NameIdentifier),
            principal.FindFirstValue(ClaimTypes.Name) ?? principal.FindFirstValue(ClaimTypes.Email));
}
