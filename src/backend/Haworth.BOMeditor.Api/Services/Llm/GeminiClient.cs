using System.Text;
using System.Text.Json;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Services.Llm;

/// <summary>Google Gemini provider via generateContent; grounding PDF sent as inline_data.</summary>
public class GeminiClient(HttpClient http) : ILlmClient
{
    public AiProvider Provider => AiProvider.Gemini;

    public async Task<string> CompleteAsync(LlmRequest request, CancellationToken ct = default)
    {
        var parts = new List<object>();
        if (request.GroundingPdf is { Length: > 0 })
        {
            parts.Add(new { inline_data = new { mime_type = "application/pdf", data = Convert.ToBase64String(request.GroundingPdf) } });
        }
        parts.Add(new { text = request.UserPrompt });

        var body = new
        {
            system_instruction = new { parts = new object[] { new { text = request.SystemInstructions } } },
            contents = new object[] { new { role = "user", parts } }
        };

        // Gemini takes the model in the URL path; strip any "models/" prefix or whitespace to avoid a 400.
        var model = request.Model?.Trim() ?? string.Empty;
        if (model.StartsWith("models/", StringComparison.OrdinalIgnoreCase))
            model = model["models/".Length..];
        if (string.IsNullOrEmpty(model))
            throw new InvalidOperationException("Gemini model name is not configured.");

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={Uri.EscapeDataString(request.ApiKey)}";
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
        return sb.ToString().Trim();
    }
}
