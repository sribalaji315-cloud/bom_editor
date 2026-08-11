using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Endpoints;

public static class AiEndpoints
{
    public static IEndpointRouteBuilder MapAiEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ai").RequireAuthorization();

        group.MapGet("/settings", async (IAiSettingsService service, CancellationToken ct) =>
            Results.Ok(await service.GetAsync(ct)))
            .RequireAuthorization(UserEndpoints.AdminPolicy);

        group.MapPut("/settings", async (
            UpdateAiSettingsRequest request, IAiSettingsService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.UpdateAsync(request, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(UserEndpoints.AdminPolicy);

        group.MapPost("/upload-grounding", async (HttpRequest http, IAiSettingsService service, CancellationToken ct) =>
        {
            if (!http.HasFormContentType) return Results.BadRequest("Expected multipart form data.");
            var form = await http.ReadFormAsync(ct);
            var file = form.Files.GetFile("file");
            if (file is null || file.Length == 0) return Results.BadRequest("No file uploaded.");
            await using var stream = file.OpenReadStream();
            await service.SetGroundingFileAsync(file.FileName, stream, ct);
            return Results.NoContent();
        }).RequireAuthorization(UserEndpoints.AdminPolicy).DisableAntiforgery();

        group.MapPost("/test", async (
            TestProviderRequest request, IAiTranslationService service, CancellationToken ct) =>
            Results.Ok(await service.TestAsync(request.Provider, ct)))
            .RequireAuthorization(UserEndpoints.AdminPolicy);

        group.MapPost("/translate", async (
            TranslateRequest request, IAiTranslationService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.TranslateAsync(request, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }).RequireAuthorization(BomEndpoints.EditPolicy);

        return app;
    }
}
