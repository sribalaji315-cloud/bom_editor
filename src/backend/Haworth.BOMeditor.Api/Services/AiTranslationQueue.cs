using System.Threading.Channels;

namespace Haworth.BOMeditor.Api.Services;

/// <summary>
/// Hands queued translation job ids to the background worker. Single reader by design: one job runs
/// at a time so the provider is never hit concurrently.
/// </summary>
public class AiTranslationQueue
{
    private readonly Channel<Guid> _channel =
        Channel.CreateUnbounded<Guid>(new UnboundedChannelOptions { SingleReader = true });

    public void Enqueue(Guid jobId) => _channel.Writer.TryWrite(jobId);

    public IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken ct) => _channel.Reader.ReadAllAsync(ct);
}
