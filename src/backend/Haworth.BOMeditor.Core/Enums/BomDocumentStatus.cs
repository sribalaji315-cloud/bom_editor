namespace Haworth.BOMeditor.Core.Enums;

/// <summary>
/// Review state of a BOM document. Only <see cref="Draft"/> documents are editable; the rest are
/// frozen so a reviewed structure cannot change underneath the approver.
/// </summary>
public enum BomDocumentStatus
{
    Draft,
    InReview,
    Approved,
    Released
}
