using Haworth.BOMeditor.Core.Enums;

namespace Haworth.BOMeditor.Core.Domain;

/// <summary>
/// A single BOM line. The hierarchy is modelled as a self-referencing tree
/// (<see cref="ParentId"/> + <see cref="SortOrder"/>); the CSV level1-8 columns are
/// derived from tree depth on export and are not persisted.
/// Numeric-looking fields are stored as strings because the source CSV may contain
/// the literal token "Formula" in place of a value.
/// </summary>
public class BomLine
{
    public Guid Id { get; set; }

    public Guid BomDocumentId { get; set; }
    public BomDocument BomDocument { get; set; } = null!;

    public Guid? ParentId { get; set; }
    public BomLine? Parent { get; set; }
    public ICollection<BomLine> Children { get; set; } = new List<BomLine>();

    /// <summary>Order among siblings under the same parent.</summary>
    public int SortOrder { get; set; }

    /// <summary>Change-set action staged for PLM.</summary>
    public BomAction Action { get; set; } = BomAction.Keep;

    /// <summary>Soft-delete flag; deleted lines stay in the tree but are excluded from export and editing.</summary>
    public bool IsDeleted { get; set; }

    // CSV attribute columns.
    public string? Position { get; set; }
    public string? BsObjectId { get; set; }
    public string? LegacySwingId { get; set; }
    public string? DrawingNo { get; set; }
    public string? Description { get; set; }
    public string? FinalQuantity { get; set; }
    public string? Constant { get; set; }
    public string? Class { get; set; }
    public string? Uom { get; set; }
    public bool IsEbom { get; set; }
    public bool Phantom { get; set; }
    public string? ReleaseTemplate { get; set; }
    public string? Conditions { get; set; }
    public string? ConditionsPlm { get; set; }
    public string? Formula { get; set; }
    public string? FormulaPlm { get; set; }
    public string? Route { get; set; }
    public string? BomExplosion { get; set; }
    public string? NoOfPiecesInPack { get; set; }
    public string? WeightKg { get; set; }
    public string? VolumeM3 { get; set; }
}
