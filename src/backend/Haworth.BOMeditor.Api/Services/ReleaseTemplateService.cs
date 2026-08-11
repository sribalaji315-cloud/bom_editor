using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

public class ReleaseTemplateService(AppDbContext db) : IReleaseTemplateService
{
    public async Task<IReadOnlyList<ReleaseTemplateDto>> GetAllAsync(CancellationToken ct = default) =>
        await db.ReleaseTemplates
            .OrderBy(t => t.Name)
            .Select(t => new ReleaseTemplateDto(t.Id, t.Name, t.IsActive))
            .ToListAsync(ct);

    public async Task<ReleaseTemplateDto> CreateAsync(CreateReleaseTemplateRequest request, CancellationToken ct = default)
    {
        var name = Validate(request.Name);
        await EnsureNameAvailableAsync(name, null, ct);

        var now = DateTimeOffset.UtcNow;
        var template = new ReleaseTemplate
        {
            Id = Guid.NewGuid(),
            Name = name,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.ReleaseTemplates.Add(template);
        await db.SaveChangesAsync(ct);
        return new ReleaseTemplateDto(template.Id, template.Name, template.IsActive);
    }

    public async Task<ReleaseTemplateDto> UpdateAsync(Guid id, UpdateReleaseTemplateRequest request, CancellationToken ct = default)
    {
        var template = await db.ReleaseTemplates.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException("Release template not found.");

        var name = Validate(request.Name);
        await EnsureNameAvailableAsync(name, id, ct);

        template.Name = name;
        template.IsActive = request.IsActive;
        template.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return new ReleaseTemplateDto(template.Id, template.Name, template.IsActive);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var template = await db.ReleaseTemplates.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException("Release template not found.");
        db.ReleaseTemplates.Remove(template);
        await db.SaveChangesAsync(ct);
    }

    private static string Validate(string? name)
    {
        var trimmed = name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new InvalidOperationException("Name is required.");
        return trimmed;
    }

    private async Task EnsureNameAvailableAsync(string name, Guid? excludingId, CancellationToken ct)
    {
        var exists = await db.ReleaseTemplates
            .AnyAsync(t => t.Id != excludingId && t.Name.ToLower() == name.ToLower(), ct);
        if (exists)
            throw new InvalidOperationException("A release template with this name already exists.");
    }
}
