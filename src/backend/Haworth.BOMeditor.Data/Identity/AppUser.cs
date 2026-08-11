using Microsoft.AspNetCore.Identity;

namespace Haworth.BOMeditor.Data.Identity;

/// <summary>
/// Application user. Extends the ASP.NET Core Identity user with a display name.
/// </summary>
public class AppUser : IdentityUser<Guid>
{
    public string? DisplayName { get; set; }
}
