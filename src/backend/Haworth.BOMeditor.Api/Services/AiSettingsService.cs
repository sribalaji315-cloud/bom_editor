using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

public class AiSettingsService : IAiSettingsService
{
    private const string ProtectorPurpose = "AiProviderApiKeys";
    private readonly AppDbContext _db;
    private readonly IDataProtector _protector;
    private readonly string _groundingDir;

    public AiSettingsService(AppDbContext db, IDataProtectionProvider protection, IWebHostEnvironment env)
    {
        _db = db;
        _protector = protection.CreateProtector(ProtectorPurpose);
        _groundingDir = Path.Combine(env.ContentRootPath, "App_Data", "ai-grounding");
    }

    public async Task<AiSettingsDto> GetAsync(CancellationToken ct = default)
    {
        var setting = await GetOrCreateSettingAsync(ct);
        var providers = await _db.AiProviderConfigs.OrderBy(c => c.Provider).ToListAsync(ct);
        var instructions = await _db.AiInstructions.OrderBy(i => i.Context).ToListAsync(ct);
        return new AiSettingsDto(
            setting.ActiveProvider,
            setting.GroundingEnabled,
            setting.GroundingFileName,
            providers.Select(p => new ProviderConfigDto(p.Provider, p.Model, p.Enabled, !string.IsNullOrEmpty(p.ApiKeyEncrypted))).ToList(),
            instructions.Select(i => new InstructionDto(i.Context, i.SystemInstructions)).ToList());
    }

    public async Task<AiSettingsDto> UpdateAsync(UpdateAiSettingsRequest request, CancellationToken ct = default)
    {
        var setting = await GetOrCreateSettingAsync(ct);
        setting.ActiveProvider = request.ActiveProvider;
        setting.GroundingEnabled = request.GroundingEnabled;

        foreach (var p in request.Providers)
        {
            var config = await _db.AiProviderConfigs.FirstOrDefaultAsync(c => c.Provider == p.Provider, ct);
            if (config is null)
            {
                config = new AiProviderConfig { Id = Guid.NewGuid(), Provider = p.Provider };
                _db.AiProviderConfigs.Add(config);
            }
            config.Model = p.Model?.Trim() ?? string.Empty;
            config.Enabled = p.Enabled;
            // Only overwrite the stored key when a new non-empty value is supplied.
            if (!string.IsNullOrWhiteSpace(p.ApiKey))
                config.ApiKeyEncrypted = _protector.Protect(p.ApiKey.Trim());
            config.UpdatedAt = DateTimeOffset.UtcNow;
        }

        foreach (var i in request.Instructions)
        {
            var instruction = await _db.AiInstructions.FirstOrDefaultAsync(x => x.Context == i.Context, ct);
            if (instruction is null)
            {
                instruction = new AiInstruction { Id = Guid.NewGuid(), Context = i.Context };
                _db.AiInstructions.Add(instruction);
            }
            instruction.SystemInstructions = i.SystemInstructions ?? string.Empty;
            instruction.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        return await GetAsync(ct);
    }

    public async Task SetGroundingFileAsync(string fileName, Stream content, CancellationToken ct = default)
    {
        Directory.CreateDirectory(_groundingDir);
        var path = Path.Combine(_groundingDir, "grounding.pdf");
        await using (var file = File.Create(path))
            await content.CopyToAsync(file, ct);

        var setting = await GetOrCreateSettingAsync(ct);
        setting.GroundingFileName = Path.GetFileName(fileName);
        setting.GroundingFilePath = path;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ResolvedProvider> ResolveProviderAsync(AiProvider? provider, CancellationToken ct = default)
    {
        var setting = await GetOrCreateSettingAsync(ct);
        var target = provider ?? setting.ActiveProvider;
        var config = await _db.AiProviderConfigs.FirstOrDefaultAsync(c => c.Provider == target, ct)
            ?? throw new InvalidOperationException($"Provider {target} is not configured.");
        if (!config.Enabled)
            throw new InvalidOperationException($"Provider {target} is disabled.");
        if (string.IsNullOrEmpty(config.ApiKeyEncrypted))
            throw new InvalidOperationException($"Provider {target} has no API key configured.");

        var key = _protector.Unprotect(config.ApiKeyEncrypted);

        byte[]? grounding = null;
        if (setting.GroundingEnabled && !string.IsNullOrEmpty(setting.GroundingFilePath) && File.Exists(setting.GroundingFilePath))
            grounding = await File.ReadAllBytesAsync(setting.GroundingFilePath, ct);

        return new ResolvedProvider(target, config.Model, key, grounding, setting.GroundingFileName);
    }

    private async Task<AiSetting> GetOrCreateSettingAsync(CancellationToken ct)
    {
        var setting = await _db.AiSettings.FirstOrDefaultAsync(ct);
        if (setting is null)
        {
            setting = new AiSetting { Id = Guid.NewGuid(), ActiveProvider = AiProvider.OpenAI, GroundingEnabled = true };
            _db.AiSettings.Add(setting);
            await _db.SaveChangesAsync(ct);
        }
        return setting;
    }
}
