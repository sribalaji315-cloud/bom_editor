using Haworth.BOMeditor.Core.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace Haworth.BOMeditor.Api.Middleware;

/// <summary>Turns workflow and stale-edit failures into 409 responses the client can act on.</summary>
public class WorkflowExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken ct)
    {
        switch (exception)
        {
            case BomConcurrencyException conflict:
                context.Response.StatusCode = StatusCodes.Status409Conflict;
                await context.Response.WriteAsJsonAsync(
                    new { error = conflict.Message, lineId = conflict.LineId }, ct);
                return true;

            case BomWorkflowException:
                context.Response.StatusCode = StatusCodes.Status409Conflict;
                await context.Response.WriteAsJsonAsync(new { error = exception.Message }, ct);
                return true;

            default:
                return false;
        }
    }
}
