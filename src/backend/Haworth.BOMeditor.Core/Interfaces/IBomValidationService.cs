using Haworth.BOMeditor.Core.Dtos;

namespace Haworth.BOMeditor.Core.Interfaces;

/// <summary>Runs the active validation rules against a BOM document on demand.</summary>
public interface IBomValidationService
{
    /// <summary>Returns the report, or null when the document does not exist.</summary>
    Task<ValidationReportDto?> ValidateAsync(Guid documentId, CancellationToken ct = default);
}
