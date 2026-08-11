namespace Haworth.BOMeditor.Core.Enums;

/// <summary>
/// Application roles seeded at startup. Names are used as identity role names and JWT claims.
/// </summary>
public static class AppRole
{
    public const string Manufacturing = "Manufacturing";
    public const string DataSpecialist = "DataSpecialist";
    public const string Admin = "Admin";
    public const string Engineering = "Engineering";

    public static readonly string[] All =
    [
        Manufacturing,
        DataSpecialist,
        Admin,
        Engineering
    ];

    /// <summary>Roles permitted to edit BOM lines.</summary>
    public static readonly string[] Editors = [DataSpecialist, Admin];
}
