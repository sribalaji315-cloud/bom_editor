using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Services.Llm;

/// <summary>OpenAI provider via the Responses API; grounding PDF sent as an input_file part.</summary>
public class OpenAiClient(HttpClient http) : ILlmClient
{
    public AiProvider Provider => AiProvider.OpenAI;

    public async Task<string> CompleteAsync(LlmRequest request, CancellationToken ct = default)
    {
        var userContent = new List<object> { new { type = "input_text", text = request.UserPrompt } };
        if (request.GroundingPdf is { Length: > 0 })
        {
            var b64 = Convert.ToBase64String(request.GroundingPdf);
            userContent.Insert(0, new
            {
                type = "input_file",
                filename = request.GroundingFileName ?? "grounding.pdf",
                file_data = $"data:application/pdf;base64,{b64}"
            });
        }

        var body = new
        {
            model = request.Model,
            input = new object[]
            {
                new { role = "system", content = new object[] { new { type = "input_text", text = request.SystemInstructions } } },
                new { role = "user", content = userContent }
            }
        };

        using var message = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/responses");
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey);
        message.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var response = await http.SendAsync(message, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"OpenAI request failed ({(int)response.StatusCode}): {json}");

        using var doc = JsonDocument.Parse(json);
        var sb = new StringBuilder();
        if (doc.RootElement.TryGetProperty("output", out var output))
        {
            foreach (var item in output.EnumerateArray())
            {
                if (!item.TryGetProperty("content", out var content)) continue;
                foreach (var part in content.EnumerateArray())
                {
                    if (part.TryGetProperty("type", out var t) && t.GetString() == "output_text"
                        && part.TryGetProperty("text", out var txt))
                        sb.Append(txt.GetString());
                }
            }
        }
        return sb.ToString().Trim();
    }
}
