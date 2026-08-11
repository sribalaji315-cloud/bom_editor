namespace Haworth.BOMeditor.Api.Csv;

/// <summary>
/// Ordered header for the ROUTE TEMPLATE CSV layout. Import reads by index and export
/// re-emits this exact order so files round-trip. Header text (including the source typos)
/// is preserved verbatim.
/// </summary>
public static class RouteCsvColumns
{
    public const int Route = 0;          // route code, e.g. ROUTE2
    public const int RouteNumber = 1;
    public const int RouteName = 2;
    public const int OperationNo = 3;
    public const int OperationId = 4;
    public const int OperationDescription = 5;
    public const int DescriptionLen = 6;
    public const int NextOperation = 7;
    public const int SwingWc = 8;
    public const int RuntimeType = 9;
    public const int SetUpTime = 10;
    public const int Time = 11;
    public const int ResourceId = 12;
    public const int ResourceGroup = 13;
    public const int RouteGroupId = 14;
    public const int Priority = 15;
    public const int RouteCondition = 16;
    public const int RouteFormula = 17;

    public static readonly string[] Header =
    [
        "ROUTE", "ROUTE NUMBER", "Route name", "OPEARTION NO", "OPEARTION ID",
        "OPEARTION DESCRIPTION", "DESCRIPTION LEN", "NEXT OPERATION", "SWING WC",
        "RUNTIME TYPE", "SET UP TIME", "TIME", "RESOURCE ID", "RESOURCE GROUP",
        "ROUTE GROUP ID", "PRIORITY", "ROUTE CONDITION", "ROUTE FORMULA"
    ];
}
