using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Services.Llm;

/// <summary>Google Gemini provider via generateContent; the grounding PDF is uploaded once via the Files API.</summary>
public class GeminiClient(HttpClient http) : ILlmClient
{
    public AiProvider Provider => AiProvider.Gemini;

    public async Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default)
    {
        string? handle = request.GroundingHandle;
        DateTimeOffset? expiresAt = null;
        if (handle is null && request.GroundingPdf is { Length: > 0 })
            (handle, expiresAt) = await UploadGroundingAsync(request, ct);

        var parts = new List<object>();
        if (handle is not null)
            parts.Add(new { file_data = new { mime_type = "application/pdf", file_uri = handle } });
        parts.Add(new { text = request.UserPrompt });

        var body = new
        {
            system_instruction = new { parts = new object[] { new { text = request.SystemInstructions } } },
            contents = new object[] { new { role = "user", parts } }
        };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ResolveModel(request.Model)}:generateContent?key={Uri.EscapeDataString(request.ApiKey)}";
        using var message = new HttpRequestMessage(HttpMethod.Post, url);
        message.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var response = await http.SendAsync(message, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Gemini request failed ({(int)response.StatusCode}): {json}");

        using var doc = JsonDocument.Parse(json);
        var sb = new StringBuilder();
        if (doc.RootElement.TryGetProperty("candidates", out var candidates))
        {
            foreach (var candidate in candidates.EnumerateArray())
            {
                if (candidate.TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var ps))
                    foreach (var part in ps.EnumerateArray())
                        if (part.TryGetProperty("text", out var txt))
                            sb.Append(txt.GetString());
            }
        }
        // Only report the handle when this call created it; the caller persists it.
        return new LlmResponse(sb.ToString().Trim(), request.GroundingHandle is null ? handle : null, expiresAt);
    }

    /// <summary>
    /// Uploads the PDF with Google's two-step resumable protocol (the Files API rejects a plain
    /// multipart post) and returns its uri plus the server-side expiry, currently 48 h.
    /// </summary>
    private async Task<(string Uri, DateTimeOffset? ExpiresAt)> UploadGroundingAsync(
        LlmRequest request, CancellationToken ct)
    {
        var pdf = request.GroundingPdf!;
        var start = new HttpRequestMessage(
            HttpMethod.Post,
            $"https://generativelanguage.googleapis.com/upload/v1beta/files?key={Uri.EscapeDataString(request.ApiKey)}")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { file = new { display_name = request.GroundingFileName ?? "grounding.pdf" } }),
                Encoding.UTF8, "application/json")
        };
        start.Headers.Add("X-Goog-Upload-Protocol", "resumable");
        start.Headers.Add("X-Goog-Upload-Command", "start");
        start.Headers.Add("X-Goog-Upload-Header-Content-Length", pdf.Length.ToString());
        start.Headers.Add("X-Goog-Upload-Header-Content-Type", "application/pdf");

        string uploadUrl;
        using (var startResponse = await http.SendAsync(start, ct))
        {
            if (!startResponse.IsSuccessStatusCode)
                throw new InvalidOperationException(
                    $"Gemini grounding upload could not start ({(int)startResponse.StatusCode}): {await startResponse.Content.ReadAsStringAsync(ct)}");
            if (!startResponse.Headers.TryGetValues("X-Goog-Upload-URL", out var urls))
                throw new InvalidOperationException("Gemini grounding upload returned no upload URL.");
            uploadUrl = urls.First();
        }

        using var upload = new HttpRequestMessage(HttpMethod.Post, uploadUrl)
        {
            Content = new ByteArrayContent(pdf)
        };
        upload.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        upload.Headers.Add("X-Goog-Upload-Offset", "0");
        upload.Headers.Add("X-Goog-Upload-Command", "upload, finalize");

        using var response = await http.SendAsync(upload, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Gemini grounding upload failed ({(int)response.StatusCode}): {json}");

        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("file", out var file) || !file.TryGetProperty("uri", out var uri))
            throw new InvalidOperationException($"Gemini grounding upload returned no file uri: {json}");

        DateTimeOffset? expiry = file.TryGetProperty("expirationTime", out var exp)
            && DateTimeOffset.TryParse(exp.GetString(), out var parsed) ? parsed : null;
        return (uri.GetString()!, expiry);
    }

    // Gemini takes the model in the URL path; strip any "models/" prefix or whitespace to avoid a 400.
    private static string ResolveModel(string? model)
    {
        var name = model?.Trim() ?? string.Empty;
        if (name.StartsWith("models/", StringComparison.OrdinalIgnoreCase))
            name = name["models/".Length..];
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Gemini model name is not configured.");
        return name;
    }
}
