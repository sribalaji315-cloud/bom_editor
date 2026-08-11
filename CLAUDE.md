
## Project Overview

BOM editor app allows users to edit bom structures and define rules in natural language. .NET 10 Minimal API backend, React + Mantine + TypeScript frontend. SQLite for local development via EF Core. ~500 internal users. Monorepo structure under `src/`.

Role-based: **Manufacturing**, **Data Specialist**, **Admin**, **Engineering**.

## Build & Run Commands

### Database
Local development uses SQLite. No external database service is required.

```bash
cd src/backend
dotnet tool restore
dotnet tool run dotnet-ef database update --project Haworth.BOMeditor.Data --startup-project Haworth.BOMeditor.Api
```

### Backend (.NET 10)
```bash
cd src/backend
dotnet build
dotnet run --project Haworth.BOMeditor.Api   # Runs on http://localhost:5000
dotnet test                                              # Run all tests
dotnet tool restore                                      # Restore local dotnet-ef tool
dotnet tool run dotnet-ef database update --project Haworth.BOMeditor.Data --startup-project Haworth.BOMeditor.Api  # Apply migrations
```

### Frontend (React + Vite)
```bash
cd src/frontend
npm install
npm run dev       # http://localhost:3000 with /api proxy to backend
npm run build     # TypeScript check + Vite production build
npm run lint      # ESLint
```

## Requirements & Design Docs

Before implementing or planning any feature, always read the md file  `\BOM editor app\BOM editor app requirements.md`. This file contains requirements, and user stories that inform all implementation work. New files will be added over time, so check the full directory contents each time.

**IMPORTANT:** When planning a feature, always save the plan as a markdown file in `doc/requirements/plans/` with a meaningful name (e.g. `BOM-hierarchy.md`, `excel-export.md`). This is the only location for plans — never store plans elsewhere. These plans serve as the agreed design record and should be referenced during implementation.

The following areas require a design discussion **before writing any code**:
- Any new feature area or module
- Excel export (format, library, ERP column mapping)
- Azure AD / SSO swap (when the time comes, plan before touching auth)

## i18n
- All user-facing strings must use `t()` from react-i18next — no hardcoded strings in components
- Namespace by domain: common, classification, errors
- Translation files in `src/i18n/locales/en/`
- Never use inline strings in Mantine components — always t('key')

## Architecture Decisions

- **No CQRS** — simple service layer pattern
- Classification master-data write actions go through services and write immutable audit entries
- Auth: ASP.NET Core Identity + JWT now, Azure AD / OIDC later via abstraction
- DB: SQLite for local development via EF Core — enum states stored as strings

## Backend Conventions

### 3-layer .NET solution (`src/backend/`)
- **Api** — Minimal API endpoints organized in `Endpoints/` as static extension classes. Services in `Services/`.
- **Core** — Domain models (`Domain/`), enums (`Enums/`), interfaces (`Interfaces/`). Zero framework dependencies.
- **Data** — EF Core DbContext, Identity (`AppUser`), migrations. SQLite provider for local development.

### Rules
- BOM services own validation, persistence orchestration, and audit log entries
- Never call DbContext directly from endpoints — always through services
- Business logic in `Core/` — zero framework dependencies
- Do not add CQRS, MediatR, or event sourcing patterns
- Do not add domain logic to API endpoints

### Auth & Roles
Four roles seeded at startup. JWT (HS256) with claims for id, email, name, and roles. Frontend `ProtectedRoute` checks `hasRole()` before rendering.

### Database
SQLite for local development. Connection: `Data Source=classification_tool.db`. EF Core Identity tables + app tables with restrict-delete foreign keys.

## Frontend Structure

```
src/
├── api/          — raw async API functions only, no hooks, no React
├── hooks/        — TanStack Query hooks wrapping api/ functions
├── components/
│   ├── ui/       — generic UI components, no domain knowledge
│   ├── domain/   — domain-aware components, no data fetching
│   └── layout/   — role-specific shells, AppLayout shared wrapper
├── pages/        — page components, compose domain components
├── context/      — React context (auth, etc.)
├── theme/        — Mantine Nord theme
└── types/        — shared TypeScript types
```

## Frontend Conventions

- **API functions** in `src/api/*.ts` — plain async functions, no hooks
- **Query keys** centralized in `src/api/queryKeys.ts` — never use inline strings
- **TanStack Query hooks** in `src/hooks/` — one file per domain entity
- **Reusable UI components** in `src/components/ui/` — props only, no domain types
- **Domain components** in `src/components/domain/` — know domain types, never fetch data
- **Pages** compose domain components, call hooks, handle routing concerns only
- Mantine for all UI, AG Grid for data tables, TanStack Query for server state
- Nord color palette — use theme tokens, never hardcode hex values in components

### Component Rules
- If JSX structure is repeated twice — extract a component
- UI components must not import domain types
- Domain components must not call useQuery/useMutation directly — receive data as props or compose hooks at page level
- Never fetch data inside a domain component

### Query Key Conventions
Always use `queryKeys` from `src/api/queryKeys.ts`:
- Invalidate by entity root after mutations: `queryKeys.BOMeditor.all`
- Detail queries: `queryKeys.BOMeditor.detail(id)`

## Nord Theme Tokens

- Primary: nordBlue (`#5E81AC`)
- Frost accent: nordFrost (`#88C0D0`)
- Teal accent: nordTeal (`#8FBCBB`)
- Success: nordGreen
- Warning: nordAmber
- Error: nordRed
- Dark backgrounds: dark[7] (`#2E3440`), dark[5] (`#3B4252`)


## In-App Help

Each role area must include contextual online help accessible within the UI. Users have limited technical experience — help content must be concise, plain-language, and visual where possible. Help is role-specific and covers what each page does, how to perform key tasks, and what classification states or enablement flags mean.

## Do Not
- Do not use inline query key strings — always use `queryKeys.ts`
- Do not add CQRS, MediatR, or event sourcing patterns
- Do not add domain logic to API endpoints
- Do not hardcode Nord hex values — use theme tokens
- Do not fetch data inside domain components
