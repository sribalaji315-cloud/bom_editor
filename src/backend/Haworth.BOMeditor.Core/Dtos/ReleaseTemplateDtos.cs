namespace Haworth.BOMeditor.Core.Dtos;

public record ReleaseTemplateDto(Guid Id, string Name, bool IsActive);

public record CreateReleaseTemplateRequest(string Name);

public record UpdateReleaseTemplateRequest(string Name, bool IsActive);
