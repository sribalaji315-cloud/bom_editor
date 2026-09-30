using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Dtos;

/// <summary>Editable BOM line fields shared by create/update requests and read DTOs.</summary>
public record BomLineFields
{
    public BomAction Action { get; init; } = BomAction.Keep;
    public string? Position { get; init; }
    public string? BsObjectId { get; init; }
    public string? LegacySwingId { get; init; }
    public string? DrawingNo { get; init; }
    public string? Description { get; init; }
    public string? FinalQuantity { get; init; }
    public string? Constant { get; init; }
    public string? Class { get; init; }
    public string? Uom { get; init; }
    public bool IsEbom { get; init; }
    public bool Phantom { get; init; }
    public string? ReleaseTemplate { get; init; }
    public string? Conditions { get; init; }
    public string? ConditionsPlm { get; init; }
    public string? Formula { get; init; }
    public string? FormulaPlm { get; init; }
    public string? Route { get; init; }
    public string? BomExplosion { get; init; }
    public string? NoOfPiecesInPack { get; init; }
    public string? WeightKg { get; init; }
    public string? VolumeM3 { get; init; }
}

public record BomLineDto : BomLineFields
{
    public Guid Id { get; init; }
    public Guid? ParentId { get; init; }
    public int SortOrder { get; init; }
    /// <summary>1-based tree depth, used for indentation and level column export.</summary>
    public int Level { get; init; }
    /// <summary>Soft-deleted lines are shown struck-through and omitted from export.</summary>
    public bool IsDeleted { get; init; }
    /// <summary>Send this back on update/move so a stale edit is rejected instead of overwriting.</summary>
    public Guid ConcurrencyStamp { get; init; }
}

public record BomDocumentSummaryDto(
    Guid Id,
    string Name,
    string? SourceFileName,
    int LineCount,
    DateTimeOffset CreatedAt,
    string? CreatedBy,
    DateTimeOffset UpdatedAt,
    BomDocumentStatus Status);

public record BomDocumentDetailDto(
    Guid Id,
    string Name,
    string? SourceFileName,
    DateTimeOffset CreatedAt,
    string? CreatedBy,
    DateTimeOffset UpdatedAt,
    BomDocumentStatus Status,
    DateTimeOffset? StatusChangedAt,
    string? StatusChangedBy,
    IReadOnlyList<BomLineDto> Lines);

/// <summary>Create a new line under an optional parent, at an optional position.</summary>
public record CreateBomLineRequest : BomLineFields
{
    public Guid? ParentId { get; init; }
    public int? SortOrder { get; init; }
}

/// <summary>Full replacement of a line's editable fields.</summary>
public record UpdateBomLineRequest : BomLineFields
{
    /// <summary>The stamp the caller last read; null skips the staleness check.</summary>
    public Guid? ConcurrencyStamp { get; init; }
}

/// <summary>Reparent and/or reorder a line.</summary>
public record MoveBomLineRequest(Guid? ParentId, int SortOrder, Guid? ConcurrencyStamp = null);

/// <summary>Move a document to another review state.</summary>
public record ChangeBomStatusRequest(BomDocumentStatus Status, string? Comment);

public record BomDocumentVersionSummaryDto(
    Guid Id,
    int VersionNumber,
    string? Label,
    BomDocumentStatus Status,
    DateTimeOffset CreatedAt,
    string? CreatedBy,
    int LineCount);

public record BomDocumentVersionDetailDto(
    Guid Id,
    int VersionNumber,
    string? Label,
    BomDocumentStatus Status,
    DateTimeOffset CreatedAt,
    string? CreatedBy,
    IReadOnlyList<BomLineDto> Lines);

public record CreateBomVersionRequest(string? Label);

/// <summary>Insert copies of selected lines (each with its subtree) from another BOM under an optional parent.</summary>
public record InsertBomRequest(Guid SourceDocumentId, Guid? ParentId, IReadOnlyList<Guid> LineIds);

public record BomAuditEntryDto(
    Guid Id,
    Guid? BomLineId,
    DateTimeOffset Timestamp,
    string? UserName,
    AuditChangeType ChangeType,
    string? FieldName,
    string? OldValue,
    string? NewValue);
