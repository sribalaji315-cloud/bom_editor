using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;

namespace Haworth.BOMeditor.Api.Services.Llm;

public class LlmClientFactory(IEnumerable<ILlmClient> clients) : ILlmClientFactory
{
    public ILlmClient Create(AiProvider provider) =>
        clients.FirstOrDefault(c => c.Provider == provider)
        ?? throw new InvalidOperationException($"No LLM client registered for provider {provider}.");
}
