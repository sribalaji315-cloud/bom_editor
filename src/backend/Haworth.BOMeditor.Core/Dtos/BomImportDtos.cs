namespace Haworth.BOMeditor.Core.Dtos;

/// <summary>A source column detected in an uploaded CSV header row.</summary>
public record ImportColumnDto(int Index, string Header);

/// <summary>A target BOM field a source column can be mapped to during import.</summary>
public record ImportFieldDto(string Key, bool Required);

/// <summary>
/// Result of inspecting an uploaded CSV before import: its source columns, the mappable target
/// fields, a best-guess mapping (field key -> source column index) and a few sample rows.
/// </summary>
public record ImportInspectResult(
    IReadOnlyList<ImportColumnDto> Columns,
    IReadOnlyList<ImportFieldDto> Fields,
    IReadOnlyDictionary<string, int> SuggestedMapping,
    IReadOnlyList<IReadOnlyList<string>> SampleRows);

/// <summary>Field-key -> source column index mapping supplied when importing a CSV.</summary>
public record BomImportMapping(IReadOnlyDictionary<string, int> Fields);
