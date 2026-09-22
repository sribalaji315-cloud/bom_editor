namespace Haworth.BOMeditor.Api.Csv;

/// <summary>
/// Ordered header for the mBOM CSV layout (28 columns). Import reads by index and export
/// re-emits this exact order so files round-trip.
/// </summary>
public static class BomCsvColumns
{
    public const int Action = 0;
    public const int Level1 = 1; // levels occupy indices 1..8
    public const int LevelLast = 8;
    public const int Position = 9;
    public const int BsObjectId = 10;
    public const int LegacySwingId = 11;
    public const int DrawingNo = 12;
    public const int Description = 13;
    public const int FinalQuantity = 14;
    public const int Constant = 15;
    public const int Class = 16;
    public const int Uom = 17;
    public const int IsEbom = 18;
    public const int Phantom = 19;
    public const int ReleaseTemplate = 20;
    public const int Conditions = 21;
    public const int Formula = 22;
    public const int Route = 23;
    public const int BomExplosion = 24;
    public const int NoOfPiecesInPack = 25;
    public const int WeightKg = 26;
    public const int VolumeM3 = 27;

    public static readonly string[] Header =
    [
        "Action", "level1", "level2", "level3", "level4", "level5", "level6", "level7", "level8",
        "Position", "BS Object ID", "Legacy Swing ID", "Drawing No.", "Description",
        "Final Quantity", "CONSTANT", "Class", "UoM", "IS EBOM", "PHANTOM", "Release Template",
        "Conditions", "Formula", "Route", "BOM Explosion", "No of Pieces in Pack",
        "Weight in Kg\n(per unit)", "Volume in m3\n(per Box)"
    ];
}
