# User Management Console + Sidebar Nav Shell

## Scope (agreed)
- Admin-only User Management console.
- User operations: list, create, edit roles, enable/disable, reset password, delete. (No display-name/email edit.)
- No user audit trail (for now).
- Full collapsible `AppShell.Navbar` sidebar with grouped sections, replacing the header-only layout.

## Design decisions
- **Enable/disable** uses ASP.NET Core Identity's built-in `LockoutEnd` — `DateTimeOffset.MaxValue` = disabled, `null` = enabled. Zero DB migration.
- The login endpoint is updated to reject users whose lockout is active (blocks disabled accounts), because login uses `UserManager.CheckPasswordAsync` directly (not lockout-aware).
- **Safeguards**: an admin cannot disable / delete / remove-Admin-from **themselves**; the **last** Admin cannot be removed or deleted.
- Sidebar maps to real features (BOM Documents, Admin › User Management), styled after the reference image's collapsible sections.

## Backend
1. `Core/Dtos/UserDtos.cs` — `UserSummaryDto(Id, Email, DisplayName, IsEnabled, Roles)`, `CreateUserRequest(Email, DisplayName, Password, Roles)`, `UpdateUserRolesRequest(Roles)`, `SetUserEnabledRequest(Enabled)`, `ResetPasswordRequest(NewPassword)`.
2. `Core/Interfaces/IUserService.cs` — get / create / update-roles / set-enabled / reset-password / delete; roles validated against `AppRole.All`.
3. `Api/Services/UserService.cs` — injects `UserManager<AppUser>` + `RoleManager<IdentityRole<Guid>>`. Implements enable/disable via `LockoutEnd`, role diff, password reset, safeguards.
4. `Api/Endpoints/UserEndpoints.cs` — group `/api/users`, `RequireAuthorization(AdminPolicy)`; `GET /`, `POST /`, `PUT /{id}/roles`, `PUT /{id}/enabled`, `POST /{id}/reset-password`, `DELETE /{id}`.
5. `Program.cs` — add `AdminOnly` policy (`RequireRole(AppRole.Admin)`), register `IUserService`, map `UserEndpoints`.
6. `AuthEndpoints.cs` — reject login when lockout is active.

## Frontend
7. `types/user.ts` + `api/users.ts` (plain async CRUD).
8. `api/queryKeys.ts` — add `users` key; `hooks/useUsers.ts` (query + mutations invalidating `queryKeys.users.all`).
9. `components/layout/AppLayout.tsx` — `AppShell.Navbar` + `Burger` toggle (`useDisclosure`); `NavLink` groups: BOM Documents (`/`), Admin (Admin-only) › User Management (`/admin/users`).
10. `components/domain/` — `UserTable`, `UserFormModal`, `RoleSelect`, `ResetPasswordModal`, confirm `Modal`.
11. `pages/UserManagementPage.tsx` — composes `useUsers` + mutations, renders table + modals + notifications.
12. `App.tsx` — `/admin/users` route via `ProtectedRoute roles={['Admin']}` + `AppLayout`.
13. i18n — `users` namespace (register in `config.ts`) + nav labels in `common.json`.

## Verification
- `dotnet build` / `dotnet run`; admin `GET /api/users` → 200, non-admin → 403.
- Create user, login, disable → login 401, reset password, delete. Self-lockout and last-admin guards reject.
- `npm run build` + `npm run lint`; browser: Admin sees sidebar Admin section + CRUD; non-admin does not.
