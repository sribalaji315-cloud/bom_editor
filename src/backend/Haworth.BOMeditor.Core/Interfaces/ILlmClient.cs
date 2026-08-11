using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>A single translation call to an LLM provider, optionally grounded with a PDF document.</summary>
public record LlmRequest(
    string SystemInstructions,
    string UserPrompt,
    string Model,
    string ApiKey,
    byte[]? GroundingPdf,
    string? GroundingFileName);

/// <summary>Abstraction over a specific LLM provider's HTTP API.</summary>
public interface ILlmClient
{
    AiProvider Provider { get; }
    Task<string> CompleteAsync(LlmRequest request, CancellationToken ct = default);
}

/// <summary>Resolves the <see cref="ILlmClient"/> for a given provider.</summary>
public interface ILlmClientFactory
{
    ILlmClient Create(AiProvider provider);
}
