using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Core.Validation;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

/// <summary>
/// Runs every active rule against a document. Lookup data is loaded once and handed to the pure
/// checks in <see cref="Haworth.BOMeditor.Core.Validation"/>.
/// </summary>
public class BomValidationService(AppDbContext db, IEnumerable<IBomRuleCheck> checks) : IBomValidationService
{
    public async Task<ValidationReportDto?> ValidateAsync(Guid documentId, CancellationToken ct = default)
    {
        var document = await db.BomDocuments.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId, ct);
        if (document is null) return null;

        var lines = await db.BomLines.AsNoTracking()
            .Where(l => l.BomDocumentId == documentId && !l.IsDeleted)
            .OrderBy(l => l.SortOrder)
            .ToListAsync(ct);

        var rules = await db.ValidationRules.AsNoTracking()
            .Where(r => r.IsActive)
            .OrderBy(r => r.Code)
            .ToListAsync(ct);

        // A rule can be scoped to certain document statuses; out-of-scope rules never run.
        rules = rules
            .Where(r => RuleStatusScope.Includes(r.AppliesToStatuses, document.Status))
            .ToList();

        var templates = await db.ReleaseTemplates.AsNoTracking()
            .Where(t => t.IsActive).Select(t => t.Name).ToListAsync(ct);
        var routeCodes = await db.Routes.AsNoTracking()
            .Where(r => r.IsActive).Select(r => r.Code).ToListAsync(ct);

        var context = new ValidationContext(lines, templates, routeCodes);
        var byType = checks.ToDictionary(c => c.Type);

        var issues = new List<ValidationIssueDto>();
        foreach (var rule in rules)
        {
            if (!byType.TryGetValue(rule.Type, out var check)) continue;
            foreach (var issue in check.Check(context, rule))
            {
                issues.Add(new ValidationIssueDto(
                    rule.Code, rule.Name, rule.Severity,
                    issue.LineId, issue.LineDescription, issue.Field, issue.Message));
            }
        }

        return new ValidationReportDto(
            documentId,
            DateTimeOffset.UtcNow,
            issues.Count(i => i.Severity == Core.Enums.ValidationSeverity.Error),
            issues.Count(i => i.Severity == Core.Enums.ValidationSeverity.Warning),
            issues);
    }
}
