using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Core.Validation;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

public class ValidationRuleService(AppDbContext db) : IValidationRuleService
{
    public async Task<IReadOnlyList<ValidationRuleDto>> GetAllAsync(CancellationToken ct = default) =>
        await db.ValidationRules
            .OrderBy(r => r.Code)
            .Select(r => ToDto(r))
            .ToListAsync(ct);

    public async Task<ValidationRuleDto> CreateAsync(CreateValidationRuleRequest request, CancellationToken ct = default)
    {
        var code = Require(request.Code, "Code");
        await EnsureCodeAvailableAsync(code, null, ct);

        var now = DateTimeOffset.UtcNow;
        var rule = new ValidationRule
        {
            Id = Guid.NewGuid(),
            Code = code,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        Apply(rule, request);
        db.ValidationRules.Add(rule);
        await db.SaveChangesAsync(ct);
        return ToDto(rule);
    }

    public async Task<ValidationRuleDto> UpdateAsync(Guid id, UpdateValidationRuleRequest request, CancellationToken ct = default)
    {
        var rule = await db.ValidationRules.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException("Validation rule not found.");

        Apply(rule, request);
        rule.IsActive = request.IsActive;
        rule.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return ToDto(rule);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var rule = await db.ValidationRules.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException("Validation rule not found.");
        db.ValidationRules.Remove(rule);
        await db.SaveChangesAsync(ct);
    }

    public ValidationMetadataDto GetMetadata() => new(
        Enum.GetNames<ValidationRuleType>(),
        BomLineFieldCatalog.Keys,
        Enum.GetNames<ValidationSeverity>(),
        RuleFilter.Fields,
        RuleFilter.Operators);

    private static void Apply(ValidationRule rule, ValidationRuleFields fields)
    {
        rule.Name = Require(fields.Name, "Name");
        rule.Type = fields.Type;
        rule.Severity = fields.Severity;
        rule.TargetField = Trim(fields.TargetField);
        rule.Parameters = Trim(fields.Parameters);
        rule.AppliesWhen = Trim(fields.AppliesWhen);
        rule.Message = Trim(fields.Message);

        try
        {
            RuleFilter.Validate(rule.AppliesWhen);
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException($"Applies when: {ex.Message}");
        }
    }

    private static ValidationRuleDto ToDto(ValidationRule r) => new()
    {
        Id = r.Id,
        Code = r.Code,
        Name = r.Name,
        Type = r.Type,
        Severity = r.Severity,
        TargetField = r.TargetField,
        Parameters = r.Parameters,
        AppliesWhen = r.AppliesWhen,
        Message = r.Message,
        IsActive = r.IsActive
    };

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Require(string? value, string name)
    {
        var trimmed = value?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new InvalidOperationException($"{name} is required.");
        return trimmed;
    }

    private async Task EnsureCodeAvailableAsync(string code, Guid? excludingId, CancellationToken ct)
    {
        var exists = await db.ValidationRules
            .AnyAsync(r => r.Id != excludingId && r.Code.ToLower() == code.ToLower(), ct);
        if (exists)
            throw new InvalidOperationException("A validation rule with this code already exists.");
    }
}
