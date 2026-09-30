namespace Haworth.BOMeditor.Core.Enums;

/// <summary>
/// The built-in checks an admin-defined validation rule can be based on. The rule row supplies the
/// target field, parameters, severity and message; this enum selects the logic that runs.
/// </summary>
public enum ValidationRuleType
{
    RequiredField,
    NumericField,
    AllowedValues,
    MaxLength,
    ReleaseTemplateExists,
    RouteCodeExists,
    UniqueChildBsObjectId,
    MaxDepth,
    PlmExpressionRequired,
    PhantomMustHaveChildren
}
