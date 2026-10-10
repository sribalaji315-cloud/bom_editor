using System.Text;
using System.Text.Json;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Services.Llm;

/// <summary>
/// Anthropic Claude provider via the Messages API. The grounding PDF stays inline but is marked
/// cacheable, so consecutive calls in a batch reuse the provider's prompt cache instead of re-parsing it.
/// </summary>
public class AnthropicClient(HttpClient http) : ILlmClient
{
    public AiProvider Provider => AiProvider.Anthropic;

    public async Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default)
    {
        var userContent = new List<object>();
        if (request.GroundingPdf is { Length: > 0 })
        {
            userContent.Add(new
            {
                type = "document",
                source = new { type = "base64", media_type = "application/pdf", data = Convert.ToBase64String(request.GroundingPdf) },
                cache_control = new { type = "ephemeral" }
            });
        }
        userContent.Add(new { type = "text", text = request.UserPrompt });

        var body = new
        {
            model = request.Model,
            max_tokens = 1024,
            system = request.SystemInstructions,
            messages = new object[] { new { role = "user", content = userContent } }
        };

        using var message = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        message.Headers.Add("x-api-key", request.ApiKey);
        message.Headers.Add("anthropic-version", "2023-06-01");
        message.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var response = await http.SendAsync(message, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Anthropic request failed ({(int)response.StatusCode}): {json}");

        using var doc = JsonDocument.Parse(json);
        var sb = new StringBuilder();
        if (doc.RootElement.TryGetProperty("content", out var content))
        {
            foreach (var part in content.EnumerateArray())
            {
                if (part.TryGetProperty("type", out var t) && t.GetString() == "text"
                    && part.TryGetProperty("text", out var txt))
                    sb.Append(txt.GetString());
            }
        }
        // The cache is provider-side and short-lived, so there is no handle to persist.
        return new LlmResponse(sb.ToString().Trim(), null, null);
    }
}
