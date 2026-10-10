using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Dtos;

public record ValidationIssueDto(
    string RuleCode,
    string RuleName,
    ValidationSeverity Severity,
    Guid? LineId,
    string? LineDescription,
    string? Field,
    string Message);

public record ValidationReportDto(
    Guid DocumentId,
    DateTimeOffset ValidatedAt,
    int ErrorCount,
    int WarningCount,
    IReadOnlyList<ValidationIssueDto> Issues);

/// <summary>Editable rule fields shared by create/update requests and the read DTO.</summary>
public record ValidationRuleFields
{
    public string Name { get; init; } = string.Empty;
    public ValidationRuleType Type { get; init; }
    public ValidationSeverity Severity { get; init; } = ValidationSeverity.Error;
    public string? TargetField { get; init; }
    public string? Parameters { get; init; }
    public string? AppliesWhen { get; init; }

    /// <summary>Document statuses the rule runs in; empty means every status.</summary>
    public IReadOnlyList<string> AppliesToStatuses { get; init; } = [];

    public string? Message { get; init; }
}

public record ValidationRuleDto : ValidationRuleFields
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public record CreateValidationRuleRequest : ValidationRuleFields
{
    public string Code { get; init; } = string.Empty;
}

public record UpdateValidationRuleRequest : ValidationRuleFields
{
    public bool IsActive { get; init; } = true;
}

/// <summary>Choices the admin rule form offers: rule types, targetable fields and severities.</summary>
public record ValidationMetadataDto(
    IReadOnlyList<string> RuleTypes,
    IReadOnlyList<string> Fields,
    IReadOnlyList<string> Severities,
    IReadOnlyList<string> FilterFields,
    IReadOnlyList<string> FilterOperators,
    IReadOnlyList<string> DocumentStatuses);
