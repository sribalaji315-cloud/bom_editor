namespace Haworth.BOMeditor.Core.Exceptions;

/// <summary>An action is not allowed in the document's current review state.</summary>
public class BomWorkflowException(string message) : Exception(message);

/// <summary>
/// The caller's copy of a line is stale because someone else saved it first. Carries the identifier
/// of the line so the client can refresh just that row.
/// </summary>
public class BomConcurrencyException(Guid lineId, string message) : Exception(message)
{
    public Guid LineId { get; } = lineId;
}
