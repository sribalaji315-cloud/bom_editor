using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Data.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Haworth.BOMeditor.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<BomDocument> BomDocuments => Set<BomDocument>();
    public DbSet<BomDocumentVersion> BomDocumentVersions => Set<BomDocumentVersion>();
    public DbSet<BomLine> BomLines => Set<BomLine>();
    public DbSet<BomAuditEntry> BomAuditEntries => Set<BomAuditEntry>();
    public DbSet<ReleaseTemplate> ReleaseTemplates => Set<ReleaseTemplate>();
    public DbSet<Operation> Operations => Set<Operation>();
    public DbSet<ValidationRule> ValidationRules => Set<ValidationRule>();
    public DbSet<Route> Routes => Set<Route>();
    public DbSet<RouteOperation> RouteOperations => Set<RouteOperation>();
    public DbSet<RouteAuditEntry> RouteAuditEntries => Set<RouteAuditEntry>();
    public DbSet<AiProviderConfig> AiProviderConfigs => Set<AiProviderConfig>();
    public DbSet<AiInstruction> AiInstructions => Set<AiInstruction>();
    public DbSet<AiSetting> AiSettings => Set<AiSetting>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        base.ConfigureConventions(builder);
        // SQLite cannot ORDER BY DateTimeOffset stored as text; store as a sortable long instead.
        builder.Properties<DateTimeOffset>().HaveConversion<DateTimeOffsetToBinaryConverter>();
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<BomDocument>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.Name).IsRequired().HasMaxLength(256);
            e.Property(d => d.Status).HasConversion<string>().HasMaxLength(16);
            e.HasMany(d => d.Lines)
                .WithOne(l => l.BomDocument)
                .HasForeignKey(l => l.BomDocumentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<BomDocumentVersion>(e =>
        {
            e.HasKey(v => v.Id);
            e.Property(v => v.Status).HasConversion<string>().HasMaxLength(16);
            e.Property(v => v.Label).HasMaxLength(256);
            e.Property(v => v.SnapshotJson).IsRequired();
            e.HasIndex(v => new { v.BomDocumentId, v.VersionNumber }).IsUnique();
        });

        builder.Entity<BomLine>(e =>
        {
            e.HasKey(l => l.Id);
            e.Property(l => l.Action).HasConversion<string>().HasMaxLength(16);
            e.HasOne(l => l.Parent)
                .WithMany(l => l.Children)
                .HasForeignKey(l => l.ParentId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(l => new { l.BomDocumentId, l.ParentId, l.SortOrder });
        });

        builder.Entity<BomAuditEntry>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.ChangeType).HasConversion<string>().HasMaxLength(16);
            e.HasIndex(a => a.BomDocumentId);
        });

        builder.Entity<ReleaseTemplate>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Name).IsRequired().HasMaxLength(128);
            e.HasIndex(t => t.Name).IsUnique();
        });

        builder.Entity<Operation>(e =>
        {
            e.HasKey(o => o.Id);
            e.Property(o => o.Code).IsRequired().HasMaxLength(64);
            e.Property(o => o.Description).IsRequired().HasMaxLength(256);
            e.Property(o => o.Status).HasConversion<string>().HasMaxLength(16);
            e.Property(o => o.RequestReason).HasMaxLength(512);
            e.HasIndex(o => o.Code).IsUnique();
        });

        builder.Entity<ValidationRule>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Code).IsRequired().HasMaxLength(64);
            e.Property(r => r.Name).IsRequired().HasMaxLength(256);
            e.Property(r => r.Type).HasConversion<string>().HasMaxLength(48);
            e.Property(r => r.Severity).HasConversion<string>().HasMaxLength(16);
            e.Property(r => r.TargetField).HasMaxLength(64);
            e.Property(r => r.AppliesWhen).HasMaxLength(512);
            e.Property(r => r.AppliesToStatuses).HasMaxLength(128);
            e.HasIndex(r => r.Code).IsUnique();
        });

        builder.Entity<Route>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Code).IsRequired().HasMaxLength(64);
            e.HasIndex(r => r.Code).IsUnique();
            e.HasMany(r => r.Operations)
                .WithOne(o => o.Route)
                .HasForeignKey(o => o.RouteId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<RouteOperation>(e =>
        {
            e.HasKey(o => o.Id);
            e.HasIndex(o => new { o.RouteId, o.SortOrder });
        });

        builder.Entity<RouteAuditEntry>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.ChangeType).HasConversion<string>().HasMaxLength(16);
            e.HasIndex(a => a.RouteId);
        });

        builder.Entity<AiProviderConfig>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Provider).HasConversion<string>().HasMaxLength(32);
            e.Property(c => c.Model).IsRequired().HasMaxLength(128);
            e.HasIndex(c => c.Provider).IsUnique();
        });

        builder.Entity<AiInstruction>(e =>
        {
            e.HasKey(i => i.Id);
            e.Property(i => i.Context).HasConversion<string>().HasMaxLength(16);
            e.Property(i => i.SystemInstructions).IsRequired();
            e.HasIndex(i => i.Context).IsUnique();
        });

        builder.Entity<AiSetting>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.ActiveProvider).HasConversion<string>().HasMaxLength(32);
        });
    }
}
