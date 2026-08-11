# AI Condition & Formula Translation

Embed multi-provider LLMs (OpenAI, Anthropic/Claude, Gemini) to translate natural-language
descriptions into **Bluestar PLM Configurator** condition/formula syntax on BOM lines and route
operations.

## Decisions
- **Direction:** Natural language → structured Bluestar expression.
- **Config:** In-app Admin settings page, stored in DB. API keys encrypted at rest (ASP.NET Data
  Protection), never returned raw (masked + `hasKey`).
- **Agent instructions:** Admin-only, one editable instruction set per context (BOM, Route).
- **Grounding:** Two layers = immutable Bluestar reference PDF fed directly to the LLM as a document
  input + admin-editable per-context instructions. PDF at
  `doc/requirements/Agent/Bluestar PLM Configurator - Reference Guide (1).pdf`.
  PDF is large/image-based → upload once per provider and reuse the file handle (Anthropic prompt
  caching, Gemini File API/context cache, OpenAI Files API `file_id`). Never re-send inline per call.
- **UI trigger:** Inline sparkle action on BOM Conditions/Formula cells and Route operation cells.
- **Scope:** Full multi-provider now.

## Backend
- Enums (`Core/Enums`): `AiProvider {OpenAI, Anthropic, Gemini}`, `AiContext {Bom, Route}`.
- Domain (`Core/Domain`):
  - `AiProviderConfig`: Id, Provider, Model, ApiKeyEncrypted?, GroundingFileHandle?, Enabled, timestamps.
  - `AiInstruction`: Id, Context, SystemInstructions, UpdatedAt.
  - `AiSetting`: Id, ActiveProvider (single-row global).
- DTOs (`Core/Dtos/AiDtos.cs`): AiSettingsDto, ProviderConfigDto (no raw key; hasKey), InstructionDto,
  UpdateAiSettingsRequest, TranslateRequest(Context, FieldType[condition|formula], NaturalLanguage,
  optional row context), TranslateResponse(Expression, Provider, Model), TestProviderRequest/Response.
- Interfaces (`Core/Interfaces`): `IAiSettingsService`, `IAiTranslationService`,
  `ILlmClient` (SendAsync(groundingRef, system, user, model, apiKey, ct)), `ILlmClientFactory`.
- Services (`Api/Services`): `AiSettingsService` (IDataProtector encrypt/decrypt, mask, manage grounding
  upload), `AiTranslationService` (compose grounding + instructions + NL → provider → expression),
  `OpenAiClient`/`AnthropicClient`/`GeminiClient` (typed HttpClients), `LlmClientFactory`.
- Endpoints (`Api/Endpoints/AiEndpoints.cs`), group `/api/ai`:
  - `GET /settings` (AdminPolicy) → masked AiSettingsDto
  - `PUT /settings` (AdminPolicy)
  - `POST /test` (AdminPolicy)
  - `POST /upload-grounding` (AdminPolicy)
  - `POST /translate` (EditPolicy) → TranslateResponse (no persistence; frontend applies + saves)
- `Program.cs`: AddDataProtection, AddHttpClient per provider client, AddScoped services + factory,
  MapAiEndpoints. `AppDbContext` DbSets + enum string conversion. Migration `AddAiSettings`. Seed in
  `DbSeeder` (3 provider rows empty keys/default models, 2 instruction rows, 1 AiSetting=OpenAI).

## Frontend
- `types/ai.ts`, `api/ai.ts`, `queryKeys.ai`, `hooks/useAi.ts`.
- `pages/AiSettingsPage.tsx` (Admin): provider select, masked key + model + Test, grounding status/refresh,
  agent-instruction textareas per context (BOM, Route). Route `/admin/ai-settings`, AppLayout admin nav,
  `ai.json` i18n.
- `components/domain/AiTranslateModal.tsx`: NL input → Translate → preview → Apply.
- `BomTreeGrid` + `RouteOperationsGrid`: sparkle action on condition/formula cells → modal → Apply → set
  cell value → existing update mutation.

## Security
- Keys encrypted (Data Protection); masked on read; overwrite key only when new value supplied.
- translate = EditPolicy; settings/test/upload-grounding = AdminPolicy.
- HttpClient timeout; no auto-retry v1. LLM output stored as plain string only, never evaluated.

## Verification
- `dotnet build`; migration add + database update.
- curl: admin PUT settings + upload-grounding; GET masked; dataspecialist translate 200; manufacturing
  translate 403; non-admin settings 403.
- Golden set: 3–5 NL→expression pairs from the reference guide.
- `npm run build` + `npm run lint`; manual end-to-end translate/apply/save + audit.
