using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>A single translation call to an LLM provider, optionally grounded with a PDF document.</summary>
/// <param name="GroundingHandle">Provider-side id of an already uploaded document; when set the bytes are not sent.</param>
public record LlmRequest(
    string SystemInstructions,
    string UserPrompt,
    string Model,
    string ApiKey,
    byte[]? GroundingPdf,
    string? GroundingFileName,
    string? GroundingHandle = null);

/// <summary>Completion text plus any grounding handle the client created for this call.</summary>
public record LlmResponse(string Text, string? GroundingHandle, DateTimeOffset? GroundingExpiresAt);

/// <summary>Abstraction over a specific LLM provider's HTTP API.</summary>
public interface ILlmClient
{
    AiProvider Provider { get; }
    Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default);
}

/// <summary>Resolves the <see cref="ILlmClient"/> for a given provider.</summary>
public interface ILlmClientFactory
{
    ILlmClient Create(AiProvider provider);
}
