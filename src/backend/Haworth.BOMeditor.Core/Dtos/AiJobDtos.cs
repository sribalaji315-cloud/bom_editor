using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Dtos;

public record TranslationJobItemRequest(Guid LineId, string FieldType, string NaturalLanguage);

public record CreateTranslationJobRequest(
    AiContext Context,
    Guid TargetId,
    IReadOnlyList<TranslationJobItemRequest> Items);

public record AiTranslationJobItemDto(
    Guid Id,
    Guid LineId,
    string FieldType,
    string SourceText,
    string? Expression,
    string? Error,
    DateTimeOffset? AppliedAt);

/// <param name="QueuePosition">Jobs ahead of this one while it waits; 0 once it is running or finished.</param>
public record AiTranslationJobDto(
    Guid Id,
    AiContext Context,
    Guid TargetId,
    AiJobStatus Status,
    AiProvider? Provider,
    string? Model,
    string? RequestedBy,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    int TotalItems,
    int CompletedItems,
    int FailedItems,
    int QueuePosition,
    string? Error,
    IReadOnlyList<AiTranslationJobItemDto> Items);

/// <summary>Empty list means every item that produced an expression.</summary>
public record ApplyTranslationJobRequest(IReadOnlyList<Guid> ItemIds);

public record ApplyTranslationJobResult(int Applied, int Skipped);

/// <summary>Writes an AI suggestion into a line's PLM columns; null leaves that column untouched.</summary>
public record PlmExpressionUpdate(Guid LineId, string? ConditionPlm, string? FormulaPlm);
