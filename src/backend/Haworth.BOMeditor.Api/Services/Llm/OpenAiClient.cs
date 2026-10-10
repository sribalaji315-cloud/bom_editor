using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Services.Llm;

/// <summary>OpenAI provider via the Responses API; the grounding PDF is uploaded once via the Files API.</summary>
public class OpenAiClient(HttpClient http) : ILlmClient
{
    public AiProvider Provider => AiProvider.OpenAI;

    public async Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default)
    {
        var handle = request.GroundingHandle;
        if (handle is null && request.GroundingPdf is { Length: > 0 })
            handle = await UploadGroundingAsync(request, ct);

        var userContent = new List<object> { new { type = "input_text", text = request.UserPrompt } };
        if (handle is not null)
            userContent.Insert(0, new { type = "input_file", file_id = handle });

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
        // Uploaded files do not expire; only report a handle this call created.
        return new LlmResponse(sb.ToString().Trim(), request.GroundingHandle is null ? handle : null, null);
    }

    private async Task<string> UploadGroundingAsync(LlmRequest request, CancellationToken ct)
    {
        var filePart = new ByteArrayContent(request.GroundingPdf!);
        filePart.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");

        using var form = new MultipartFormDataContent
        {
            { new StringContent("user_data"), "purpose" },
            { filePart, "file", request.GroundingFileName ?? "grounding.pdf" }
        };
        using var message = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/files") { Content = form };
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey);

        using var response = await http.SendAsync(message, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"OpenAI grounding upload failed ({(int)response.StatusCode}): {json}");

        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("id", out var id) && id.GetString() is string fileId
            ? fileId
            : throw new InvalidOperationException($"OpenAI grounding upload returned no file id: {json}");
    }
}
