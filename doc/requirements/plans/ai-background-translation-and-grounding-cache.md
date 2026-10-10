# Background AI translation jobs + provider grounding cache

Move bulk condition/formula translation off the request thread into a queued background job
(poll for progress, review results, then apply), and stop re-uploading the Bluestar grounding PDF
on every LLM call. Measured before this change: ~37 s per cell, because the PDF is re-sent and
re-parsed on every request. Caching the grounding should cut that to a few seconds; the job makes
the remaining runtime irrelevant to the user.

## Decisions
- **Review then apply.** The worker only produces suggestions; a user opens the results drawer,
  ticks rows and applies. Keeps the Draft-only edit rule, concurrency check and audit trail intact.
- **All three providers get the grounding cache** (OpenAI Files, Anthropic `cache_control`,
  Gemini Files API).
- **Jobs are surfaced in the BOM/Route editor only** — progress chip in the header + results
  drawer. No admin job console.
- **Jobs are cancellable**; the worker stops between items.
- **One job runs at a time, FIFO across documents.** Jobs are per target, so BOM A and BOM B each
  get their own job — but a single worker means B waits for A. B's job reports `QueuePosition`
  (jobs ahead of it) so the UI shows "Queued — 1 job ahead" instead of a dead 0/N progress bar.
  No parallel workers in this pass.
- The synchronous `POST /api/ai/translate-batch` and the client-side chunk loop in
  `AiBulkTranslateModal` are **removed** — otherwise there are two bulk paths. The single-cell
  sparkle (`POST /api/ai/translate`) stays synchronous.
- No separate bulk-apply HTTP endpoint: apply runs server-side inside `ApplyAsync`, so the
  one-PUT-per-line round trip problem disappears without a new `BomService` bulk method.

## Out of scope (follow-ups)
- Deduplicating identical source text, multi-cell prompts, parallel calls (the next speed lever).
- Admin "AI jobs" console, retrying individual failed items, distributed/multi-instance queue.

---

## Phase 1 — Grounding cache

1. `Core/Domain/AiProviderConfig.cs` += `GroundingHandle` (string?, 512),
   `GroundingHandleExpiresAt` (DateTimeOffset?), `GroundingHash` (string?, 64 — SHA-256 of the PDF
   so a re-upload self-invalidates). `AppDbContext` gains the max lengths. Migration
   `AddAiGroundingCache`.
2. `Core/Interfaces/ILlmClient.cs` — `LlmRequest` += `GroundingHandle`; `CompleteAsync` returns
   `LlmResponse(string Text, string? GroundingHandle, DateTimeOffset? GroundingExpiresAt)` so a
   client can report a handle it just created without holding state.
3. `Core/Dtos/AiDtos.cs` — `ResolvedProvider` += `GroundingHandle`, `GroundingHandleExpiresAt`,
   `GroundingHash`. `IAiSettingsService` += `SaveGroundingHandleAsync`.
4. `Api/Services/AiSettingsService.cs` — `ResolveProviderAsync` hashes the PDF and returns the
   stored handle only when the hash matches and it is not within an hour of expiry; otherwise it
   returns the bytes so the client re-uploads. `SetGroundingFileAsync` clears the handle columns on
   every provider row.
5. `Api/Services/Llm/` — each client uses a supplied handle, else uploads once and returns the new
   one:
   - `GeminiClient` — `POST /upload/v1beta/files`, then `file_data { mime_type, file_uri }`
     instead of `inline_data`; store the returned `expirationTime` (48 h).
   - `OpenAiClient` — multipart `POST /v1/files` (`purpose=user_data`), then
     `{ type: "input_file", file_id }`. No expiry.
   - `AnthropicClient` — keeps the base64 document block but adds
     `cache_control: { type: "ephemeral" }`; returns a null handle (5-minute TTL covers a run).
6. `AiTranslationService` persists any returned handle via `SaveGroundingHandleAsync`.
   `TestAsync` stays ungrounded.

## Phase 2 — Job model, queue and worker

7. `Core/Enums/AiJobStatus.cs` — `Queued, Running, Completed, Failed, Cancelled`.
8. `Core/Domain/AiTranslationJob.cs` — Id, Context, TargetId, Status, Provider?, Model?,
   RequestedByUserId, RequestedByUserName, CreatedAt, StartedAt?, CompletedAt?, TotalItems,
   CompletedItems, FailedItems, Error?. `AiTranslationJobItem.cs` — Id, JobId, TargetLineId,
   FieldType, SourceText, Expression?, Error?, AppliedAt?.
9. `Core/Dtos/AiJobDtos.cs` — `CreateTranslationJobRequest`, `TranslationJobItemRequest`,
   `AiTranslationJobDto` (header + counts + `QueuePosition` + items), `AiTranslationJobItemDto`,
   `ApplyTranslationJobRequest`, `ApplyTranslationJobResult`.
10. `Core/Interfaces/IAiTranslationJobService.cs` — `CreateAsync`, `GetAsync`,
    `GetLatestForTargetAsync`, `CancelAsync`, `ApplyAsync`; all take `UserContext` + `ct`.
11. `Api/Services/AiTranslationQueue.cs` — singleton over
    `Channel.CreateUnbounded<Guid>(new() { SingleReader = true })`.
12. `Api/Services/AiTranslationJobService.cs` — validates the target (BOM must be `Draft`), caps at
    500 items, **409 when a `Queued`/`Running` job already exists for that target**, writes the
    rows, enqueues. `QueuePosition` for a queued job = queued jobs created before it, plus one if a
    job is `Running` — derived from the table, so the channel stays the only in-memory state.
13. `Api/Services/AiTranslationWorker.cs : BackgroundService` — own scope per job via
    `IServiceScopeFactory` (AppDbContext / IAiSettingsService / ILlmClientFactory are scoped),
    resolves the provider once, loops items sequentially, re-reads `Status` each iteration so
    Cancel lands, saves counters per item for live progress.
14. `Api/Data/DbSeeder.cs` — `RecoverAiJobsAsync`: jobs left `Queued`/`Running` become `Failed`
    ("Interrupted by a server restart"). Correct for a single API instance.
15. `Data/AppDbContext.cs` — DbSets, enums as strings, index `(TargetId, CreatedAt)`, cascade
    Job → Items. Migration `AddAiTranslationJobs`.
16. `Api/Endpoints/AiEndpoints.cs` — delete `POST /translate-batch`; add
    `POST /translate-jobs` (202, EditPolicy), `GET /translate-jobs/{id}`,
    `GET /translate-jobs?targetId=`, `POST /translate-jobs/{id}/cancel`,
    `POST /translate-jobs/{id}/apply`.
17. `Program.cs` — `AddSingleton<AiTranslationQueue>`, `AddHostedService<AiTranslationWorker>`,
    `AddScoped<IAiTranslationJobService, AiTranslationJobService>`.

## Phase 3 — Apply path

18. `ApplyAsync` groups the selected items by line, **re-reads** each line/operation (its
    `ConcurrencyStamp` has almost certainly changed since the job started, so stamps are
    deliberately not stored on the job), builds a full `UpdateBomLineRequest` /
    `UpdateRouteOperationRequest` from current values plus the new PLM expressions, and calls
    `IBomService.UpdateLineAsync` / `IRouteService.UpdateOperationAsync` — so `EnsureEditable`,
    `EnsureCurrent` and per-field audit entries all still apply. Missing lines count as skipped.

## Phase 4 — Frontend

19. `types/aiJob.ts`, `api/aiJobs.ts`, `queryKeys.ai.job(id)` + `jobForTarget(targetId)`,
    `hooks/useAiJobs.ts` polling every 3 s while `Queued`/`Running`.
20. `AiBulkTranslateModal` — keeps the candidate table, the "only cells with no PLM value" switch
    and the `excluded`-Set selection pattern; loses the chunk loop, progress bar and result column.
    Primary button becomes "Start in background".
21. New `components/domain/AiJobDrawer.tsx` — progress + Cancel while running, "Queued — {{n}} job(s)
    ahead" while queued, item table (label joined from the page's lines), "Apply selected".
22. `BomEditorPage` / `RouteEditorPage` — `useLatestTranslationJob(id)`; the translate button shows
    a `Loader` + `412 / 800` while running or a "Queued" badge, and opens the drawer; completion
    toast compares the polled status against a `useRef` (never `setState` in an effect — the repo's
    ESLint config forbids it).
23. `ai.json` — trim unused `bulk.*`, add `job.*` (incl. `queuedAhead`, `startingShortly`).
    Interpolation vars named `n`/`done`/`total`, never `count` (would force plural keys).

---

## Verification
1. Stop the API (it locks the bin DLLs) → `dotnet build` → both migrations →
   `dotnet tool run dotnet-ef migrations has-pending-model-changes` must report **No changes** →
   rebuild before running.
2. Grounding cache: compare the `HttpClient.ILlmClient` elapsed ms between the first and second
   call in the API log; re-upload the PDF and confirm the next call re-uploads.
3. Job lifecycle on a **throwaway imported BOM** (never a seeded/dev document — `Released` is
   terminal): 202 → climbing `completedItems` → Cancel stops within one item → a new job completes.
4. Guards: duplicate job for the same target 409, `manufacturing` POST 403 / GET 200, job on a
   non-Draft BOM rejected.
5. Queueing: job on throwaway BOM A, then BOM B → B is `Queued` with `queuePosition: 1`, shows
   "Queued — 1 job ahead", flips to `Running` when A finishes; cancelling A promotes B immediately.
6. Apply a subset → PLM columns written, one audit entry per changed field, unticked items keep
   `appliedAt: null`; submit to `InReview` then apply → 409.
7. Kill the API mid-job, restart → that job reads `Failed` with the interruption message.
8. `npm run build` + `npm run lint` clean; browser check of chip/drawer/cancel/toast; delete the
   throwaway documents afterwards.
9. Write API probes as `.ps1` files — PowerShell 5.1 mangles multi-line inline `Invoke-RestMethod`,
   and JSON arrays must be read via `(Invoke-WebRequest -UseBasicParsing).Content | ConvertFrom-Json`.
