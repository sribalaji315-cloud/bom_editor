using System.Text.Json;
using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Exceptions;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

/// <summary>
/// Owns validation, persistence orchestration, and audit logging for BOM documents and lines.
/// Endpoints must go through this service and never touch <see cref="AppDbContext"/> directly.
/// </summary>
public class BomService(AppDbContext db, IBomValidationService validation) : IBomService
{
    public async Task<IReadOnlyList<BomDocumentSummaryDto>> GetDocumentsAsync(CancellationToken ct = default)
    {
        return await db.BomDocuments
            .OrderByDescending(d => d.UpdatedAt)
            .Select(d => new BomDocumentSummaryDto(
                d.Id, d.Name, d.SourceFileName, d.Lines.Count,
                d.CreatedAt, d.CreatedBy, d.UpdatedAt, d.Status))
            .ToListAsync(ct);
    }

    public async Task<BomDocumentDetailDto?> GetDocumentAsync(Guid documentId, CancellationToken ct = default)
    {
        var document = await db.BomDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId, ct);
        if (document is null) return null;

        var lines = await db.BomLines.AsNoTracking()
            .Where(l => l.BomDocumentId == documentId)
            .ToListAsync(ct);

        var parentLookup = lines.ToDictionary(l => l.Id, l => l.ParentId);
        var dtos = lines
            .OrderBy(l => l.SortOrder)
            .Select(l => ToDto(l, ComputeLevel(l.Id, parentLookup)))
            .ToList();

        return new BomDocumentDetailDto(
            document.Id, document.Name, document.SourceFileName,
            document.CreatedAt, document.CreatedBy, document.UpdatedAt,
            document.Status, document.StatusChangedAt, document.StatusChangedBy, dtos);
    }

    public async Task<BomLineDto> CreateLineAsync(
        Guid documentId, CreateBomLineRequest request, UserContext user, CancellationToken ct = default)
    {
        var document = await db.BomDocuments.FirstOrDefaultAsync(d => d.Id == documentId, ct)
            ?? throw new KeyNotFoundException("BOM document not found.");
        EnsureEditable(document);

        if (request.ParentId is Guid parentId)
        {
            var parentExists = await db.BomLines.AnyAsync(
                l => l.Id == parentId && l.BomDocumentId == documentId, ct);
            if (!parentExists)
                throw new InvalidOperationException("Parent line does not belong to this document.");
        }

        var sortOrder = request.SortOrder ?? await NextSortOrderAsync(documentId, request.ParentId, ct);

        var line = new BomLine
        {
            Id = Guid.NewGuid(),
            BomDocumentId = documentId,
            ParentId = request.ParentId,
            SortOrder = sortOrder
        };
        ApplyFields(line, request);

        db.BomLines.Add(line);
        AddAudit(documentId, line.Id, user, AuditChangeType.Create, "Line", null, line.Description);
        Touch(document);
        await db.SaveChangesAsync(ct);

        return ToDto(line, await ComputeLevelAsync(line.Id, ct));
    }

    public async Task<BomLineDto?> UpdateLineAsync(
        Guid documentId, Guid lineId, UpdateBomLineRequest request, UserContext user, CancellationToken ct = default)
    {
        var line = await db.BomLines.FirstOrDefaultAsync(
            l => l.Id == lineId && l.BomDocumentId == documentId, ct);
        if (line is null) return null;

        var document = await db.BomDocuments.FirstAsync(d => d.Id == documentId, ct);
        EnsureEditable(document);
        EnsureCurrent(line, request.ConcurrencyStamp);

        foreach (var change in DiffFields(line, request))
            AddAudit(documentId, lineId, user, AuditChangeType.Update, change.Field, change.Old, change.New);

        ApplyFields(line, request);
        line.ConcurrencyStamp = Guid.NewGuid();
        Touch(document);
        await db.SaveChangesAsync(ct);

        return ToDto(line, await ComputeLevelAsync(line.Id, ct));
    }

    public async Task<bool> DeleteLineAsync(
        Guid documentId, Guid lineId, UserContext user, CancellationToken ct = default)
    {
        var lines = await db.BomLines.Where(l => l.BomDocumentId == documentId).ToListAsync(ct);
        var target = lines.FirstOrDefault(l => l.Id == lineId);
        if (target is null) return false;

        var document = await db.BomDocuments.FirstAsync(d => d.Id == documentId, ct);
        EnsureEditable(document);

        // Soft delete: flag the target and its subtree so history is retained and export skips them.
        var subtree = CollectSubtree(lines, target);
        var affected = 0;
        foreach (var node in subtree)
        {
            if (node.IsDeleted) continue;
            node.IsDeleted = true;
            node.ConcurrencyStamp = Guid.NewGuid();
            affected++;
        }

        AddAudit(documentId, lineId, user, AuditChangeType.Delete, "Line",
            target.Description, $"Marked {affected} line(s) deleted");
        Touch(document);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> RestoreLineAsync(
        Guid documentId, Guid lineId, UserContext user, CancellationToken ct = default)
    {
        var lines = await db.BomLines.Where(l => l.BomDocumentId == documentId).ToListAsync(ct);
        var target = lines.FirstOrDefault(l => l.Id == lineId);
        if (target is null) return false;

        var document = await db.BomDocuments.FirstAsync(d => d.Id == documentId, ct);
        EnsureEditable(document);

        var subtree = CollectSubtree(lines, target);
        var affected = 0;
        foreach (var node in subtree)
        {
            if (!node.IsDeleted) continue;
            node.IsDeleted = false;
            node.ConcurrencyStamp = Guid.NewGuid();
            affected++;
        }

        AddAudit(documentId, lineId, user, AuditChangeType.Restore, "Line",
            $"Restored {affected} line(s)", target.Description);
        Touch(document);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> PurgeLineAsync(
        Guid documentId, Guid lineId, UserContext user, CancellationToken ct = default)
    {
        var lines = await db.BomLines.Where(l => l.BomDocumentId == documentId).ToListAsync(ct);
        var target = lines.FirstOrDefault(l => l.Id == lineId);
        if (target is null) return false;

        var document = await db.BomDocuments.FirstAsync(d => d.Id == documentId, ct);
        EnsureEditable(document);

        // Permanent removal: drop the target and its subtree (EF orders the self-referencing deletes).
        var subtree = CollectSubtree(lines, target);
        db.BomLines.RemoveRange(subtree);
        AddAudit(documentId, lineId, user, AuditChangeType.Delete, "Line",
            target.Description, $"Permanently removed {subtree.Count} line(s)");
        Touch(document);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> MoveLineAsync(
        Guid documentId, Guid lineId, MoveBomLineRequest request, UserContext user, CancellationToken ct = default)
    {
        var lines = await db.BomLines.Where(l => l.BomDocumentId == documentId).ToListAsync(ct);
        var line = lines.FirstOrDefault(l => l.Id == lineId);
        if (line is null) return false;

        var document = await db.BomDocuments.FirstAsync(d => d.Id == documentId, ct);
        EnsureEditable(document);
        EnsureCurrent(line, request.ConcurrencyStamp);

        if (request.ParentId is Guid newParentId)
        {
            if (newParentId == lineId)
                throw new InvalidOperationException("A line cannot be its own parent.");
            if (!lines.Any(l => l.Id == newParentId))
                throw new InvalidOperationException("Target parent does not belong to this document.");
            if (IsDescendant(lines, ancestorId: lineId, candidateId: newParentId))
                throw new InvalidOperationException("Cannot move a line beneath its own descendant.");
        }

        var oldParentId = line.ParentId;
        var oldSortOrder = line.SortOrder;
        line.ParentId = request.ParentId;
        line.SortOrder = request.SortOrder;
        line.ConcurrencyStamp = Guid.NewGuid();

        var parentChanged = oldParentId != request.ParentId;
        if (parentChanged)
        {
            AddAudit(documentId, lineId, user, AuditChangeType.Move, "ParentId",
                oldParentId?.ToString() ?? "(root)", request.ParentId?.ToString() ?? "(root)");
        }
        if (oldSortOrder != request.SortOrder)
        {
            AddAudit(documentId, lineId, user, AuditChangeType.Move, "Position",
                oldSortOrder.ToString(), request.SortOrder.ToString());
        }

        Touch(document);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> InsertBomAsync(
        Guid documentId, InsertBomRequest request, UserContext user, CancellationToken ct = default)
    {
        if (request.SourceDocumentId == documentId)
            throw new InvalidOperationException("A BOM cannot be inserted into itself.");

        var target = await db.BomDocuments.FirstOrDefaultAsync(d => d.Id == documentId, ct)
            ?? throw new KeyNotFoundException("BOM document not found.");
        EnsureEditable(target);

        var sourceExists = await db.BomDocuments.AnyAsync(d => d.Id == request.SourceDocumentId, ct);
        if (!sourceExists)
            throw new InvalidOperationException("Source BOM document not found.");

        var targetLines = await db.BomLines.Where(l => l.BomDocumentId == documentId).ToListAsync(ct);
        if (request.ParentId is Guid parentId)
        {
            var parent = targetLines.FirstOrDefault(l => l.Id == parentId);
            if (parent is null)
                throw new InvalidOperationException("Target parent does not belong to this document.");
            if (parent.IsDeleted)
                throw new InvalidOperationException("Cannot insert under a deleted line.");
        }

        // Copy only live source lines; deleted ones are not carried over.
        var sourceLines = await db.BomLines
            .Where(l => l.BomDocumentId == request.SourceDocumentId && !l.IsDeleted)
            .ToListAsync(ct);
        var byId = sourceLines.ToDictionary(l => l.Id);
        var childrenByParent = sourceLines.ToLookup(l => l.ParentId);

        // Selected nodes bring their whole subtree; the union is copied once (overlaps de-duplicated).
        var copySet = new HashSet<Guid>();
        var stack = new Stack<Guid>();
        foreach (var selected in request.LineIds)
        {
            if (!byId.ContainsKey(selected)) continue;
            stack.Push(selected);
            while (stack.Count > 0)
            {
                var current = stack.Pop();
                if (!copySet.Add(current)) continue;
                foreach (var child in childrenByParent[current]) stack.Push(child.Id);
            }
        }
        if (copySet.Count == 0)
            throw new InvalidOperationException("Select at least one line to insert.");

        var idMap = copySet.ToDictionary(id => id, _ => Guid.NewGuid());
        var rootSortOrder = await NextSortOrderAsync(documentId, request.ParentId, ct);

        // A copied line is a "root" when its source parent is not part of the copied set.
        bool IsRoot(BomLine l) => l.ParentId is not Guid p || !copySet.Contains(p);
        var rootOrder = copySet.Select(id => byId[id])
            .Where(IsRoot)
            .OrderBy(l => l.SortOrder)
            .Select((l, i) => (l.Id, Sort: rootSortOrder + i))
            .ToDictionary(x => x.Id, x => x.Sort);

        var copies = new List<BomLine>();
        foreach (var id in copySet)
        {
            var source = byId[id];
            var root = IsRoot(source);
            var copy = new BomLine
            {
                Id = idMap[id],
                BomDocumentId = documentId,
                ParentId = root ? request.ParentId : idMap[source.ParentId!.Value],
                SortOrder = root ? rootOrder[id] : source.SortOrder,
                IsDeleted = false
            };
            ApplyFields(copy, ToFields(source));
            copy.Action = BomAction.Add;
            copies.Add(copy);
        }

        db.BomLines.AddRange(copies);
        AddAudit(documentId, request.ParentId, user, AuditChangeType.Create, "Line",
            null, $"Inserted {copies.Count} line(s) from another BOM");
        Touch(target);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteDocumentAsync(Guid documentId, CancellationToken ct = default)
    {
        var document = await db.BomDocuments.FirstOrDefaultAsync(d => d.Id == documentId, ct);
        if (document is null) return false;

        // Remove lines and audit rows explicitly; EF orders line deletes children-first for the self FK.
        var lines = await db.BomLines.Where(l => l.BomDocumentId == documentId).ToListAsync(ct);
        var audits = await db.BomAuditEntries.Where(a => a.BomDocumentId == documentId).ToListAsync(ct);
        var versions = await db.BomDocumentVersions.Where(v => v.BomDocumentId == documentId).ToListAsync(ct);
        db.BomLines.RemoveRange(lines);
        db.BomAuditEntries.RemoveRange(audits);
        db.BomDocumentVersions.RemoveRange(versions);
        db.BomDocuments.Remove(document);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<BomAuditEntryDto>> GetAuditAsync(Guid documentId, CancellationToken ct = default)
    {
        return await db.BomAuditEntries.AsNoTracking()
            .Where(a => a.BomDocumentId == documentId)
            .OrderByDescending(a => a.Timestamp)
            .Select(a => new BomAuditEntryDto(
                a.Id, a.BomLineId, a.Timestamp, a.UserName, a.ChangeType,
                a.FieldName, a.OldValue, a.NewValue))
            .ToListAsync(ct);
    }

    // ---- workflow ---------------------------------------------------------

    /// <summary>Legal transitions and the roles allowed to perform each.</summary>
    private static readonly (BomDocumentStatus From, BomDocumentStatus To, string[] Roles)[] Transitions =
    [
        (BomDocumentStatus.Draft, BomDocumentStatus.InReview, [AppRole.DataSpecialist, AppRole.Admin, AppRole.Engineering]),
        (BomDocumentStatus.InReview, BomDocumentStatus.Approved, [AppRole.DataSpecialist, AppRole.Admin]),
        (BomDocumentStatus.InReview, BomDocumentStatus.Draft, [AppRole.DataSpecialist, AppRole.Admin]),
        (BomDocumentStatus.Approved, BomDocumentStatus.Released, [AppRole.Admin]),
        (BomDocumentStatus.Approved, BomDocumentStatus.Draft, [AppRole.DataSpecialist, AppRole.Admin])
    ];

    public async Task<BomDocumentDetailDto?> ChangeStatusAsync(
        Guid documentId, ChangeBomStatusRequest request, UserContext user, CancellationToken ct = default)
    {
        var document = await db.BomDocuments.FirstOrDefaultAsync(d => d.Id == documentId, ct);
        if (document is null) return null;

        var transition = Transitions.FirstOrDefault(t => t.From == document.Status && t.To == request.Status);
        if (transition.Roles is null)
            throw new BomWorkflowException($"A {document.Status} BOM cannot move to {request.Status}.");
        if (!user.IsInRole(transition.Roles))
            throw new BomWorkflowException($"Your role cannot move a BOM to {request.Status}.");

        // A BOM must be clean before anyone is asked to review it.
        if (request.Status == BomDocumentStatus.InReview)
        {
            var report = await validation.ValidateAsync(documentId, ct);
            if (report is { ErrorCount: > 0 })
                throw new BomWorkflowException(
                    $"Fix the {report.ErrorCount} validation error(s) before submitting for review.");
        }

        var previous = document.Status;
        document.Status = request.Status;
        document.StatusChangedAt = DateTimeOffset.UtcNow;
        document.StatusChangedBy = user.UserName;
        AddAudit(documentId, null, user, AuditChangeType.Status, "Status",
            previous.ToString(), string.IsNullOrWhiteSpace(request.Comment)
                ? request.Status.ToString()
                : $"{request.Status} — {request.Comment}");
        Touch(document);

        // Approval and release freeze the structure, so keep a restorable copy of it.
        if (request.Status is BomDocumentStatus.Approved or BomDocumentStatus.Released)
            await AddSnapshotAsync(document, request.Status.ToString(), user, ct);

        await db.SaveChangesAsync(ct);
        return await GetDocumentAsync(documentId, ct);
    }

    public async Task<IReadOnlyList<BomDocumentVersionSummaryDto>> GetVersionsAsync(
        Guid documentId, CancellationToken ct = default) =>
        await db.BomDocumentVersions.AsNoTracking()
            .Where(v => v.BomDocumentId == documentId)
            .OrderByDescending(v => v.VersionNumber)
            .Select(v => new BomDocumentVersionSummaryDto(
                v.Id, v.VersionNumber, v.Label, v.Status, v.CreatedAt, v.CreatedBy, v.LineCount))
            .ToListAsync(ct);

    public async Task<BomDocumentVersionDetailDto?> GetVersionAsync(
        Guid documentId, Guid versionId, CancellationToken ct = default)
    {
        var version = await db.BomDocumentVersions.AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == versionId && v.BomDocumentId == documentId, ct);
        if (version is null) return null;

        return new BomDocumentVersionDetailDto(
            version.Id, version.VersionNumber, version.Label, version.Status,
            version.CreatedAt, version.CreatedBy, Deserialize(version.SnapshotJson));
    }

    public async Task<BomDocumentVersionSummaryDto?> CreateVersionAsync(
        Guid documentId, CreateBomVersionRequest request, UserContext user, CancellationToken ct = default)
    {
        var document = await db.BomDocuments.FirstOrDefaultAsync(d => d.Id == documentId, ct);
        if (document is null) return null;

        var version = await AddSnapshotAsync(document, request.Label, user, ct);
        await db.SaveChangesAsync(ct);
        return new BomDocumentVersionSummaryDto(
            version.Id, version.VersionNumber, version.Label, version.Status,
            version.CreatedAt, version.CreatedBy, version.LineCount);
    }

    public async Task<bool> RestoreVersionAsync(
        Guid documentId, Guid versionId, UserContext user, CancellationToken ct = default)
    {
        var document = await db.BomDocuments.FirstOrDefaultAsync(d => d.Id == documentId, ct);
        if (document is null) return false;

        var version = await db.BomDocumentVersions
            .FirstOrDefaultAsync(v => v.Id == versionId && v.BomDocumentId == documentId, ct);
        if (version is null) return false;
        EnsureEditable(document);

        // Drop the current tree first: the self-referencing FK is Restrict, so inserts and deletes
        // of the same ids must not be in one SaveChanges.
        var current = await db.BomLines.Where(l => l.BomDocumentId == documentId).ToListAsync(ct);
        db.BomLines.RemoveRange(current);
        await db.SaveChangesAsync(ct);

        var restored = Deserialize(version.SnapshotJson).Select(dto =>
        {
            var line = new BomLine
            {
                Id = dto.Id,
                BomDocumentId = documentId,
                ParentId = dto.ParentId,
                SortOrder = dto.SortOrder,
                IsDeleted = dto.IsDeleted,
                ConcurrencyStamp = Guid.NewGuid()
            };
            ApplyFields(line, dto);
            return line;
        }).ToList();

        db.BomLines.AddRange(restored);
        AddAudit(documentId, null, user, AuditChangeType.Restore, "Document",
            $"{current.Count} line(s)", $"Restored version {version.VersionNumber} ({restored.Count} line(s))");
        Touch(document);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ---- helpers ----------------------------------------------------------

    private static void EnsureEditable(BomDocument document)
    {
        if (document.Status != BomDocumentStatus.Draft)
            throw new BomWorkflowException($"This BOM is {document.Status} and cannot be edited.");
    }

    private static void EnsureCurrent(BomLine line, Guid? stamp)
    {
        if (stamp is Guid expected && expected != line.ConcurrencyStamp)
            throw new BomConcurrencyException(line.Id,
                "This line was changed by someone else. Reload before saving again.");
    }

    private async Task<BomDocumentVersion> AddSnapshotAsync(
        BomDocument document, string? label, UserContext user, CancellationToken ct)
    {
        var detail = await GetDocumentAsync(document.Id, ct);
        var lines = detail?.Lines ?? [];
        var lastNumber = await db.BomDocumentVersions
            .Where(v => v.BomDocumentId == document.Id)
            .MaxAsync(v => (int?)v.VersionNumber, ct) ?? 0;

        var version = new BomDocumentVersion
        {
            Id = Guid.NewGuid(),
            BomDocumentId = document.Id,
            VersionNumber = lastNumber + 1,
            Label = string.IsNullOrWhiteSpace(label) ? null : label.Trim(),
            Status = document.Status,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = user.UserName,
            LineCount = lines.Count,
            SnapshotJson = JsonSerializer.Serialize(lines)
        };
        db.BomDocumentVersions.Add(version);
        return version;
    }

    private static IReadOnlyList<BomLineDto> Deserialize(string json) =>
        JsonSerializer.Deserialize<List<BomLineDto>>(json) ?? [];

    private static List<BomLine> CollectSubtree(List<BomLine> lines, BomLine root)
    {
        var childrenByParent = lines.ToLookup(l => l.ParentId);
        var result = new List<BomLine>();
        var stack = new Stack<BomLine>();
        stack.Push(root);
        while (stack.Count > 0)
        {
            var current = stack.Pop();
            result.Add(current);
            foreach (var kid in childrenByParent[current.Id]) stack.Push(kid);
        }
        return result;
    }

    private async Task<int> NextSortOrderAsync(Guid documentId, Guid? parentId, CancellationToken ct)
    {
        var max = await db.BomLines
            .Where(l => l.BomDocumentId == documentId && l.ParentId == parentId)
            .MaxAsync(l => (int?)l.SortOrder, ct);
        return (max ?? -1) + 1;
    }

    private async Task<int> ComputeLevelAsync(Guid lineId, CancellationToken ct)
    {
        var lookup = await db.BomLines
            .Select(l => new { l.Id, l.ParentId })
            .ToDictionaryAsync(l => l.Id, l => l.ParentId, ct);
        return ComputeLevel(lineId, lookup);
    }

    private static int ComputeLevel(Guid lineId, IReadOnlyDictionary<Guid, Guid?> parentLookup)
    {
        var level = 1;
        var current = lineId;
        while (parentLookup.TryGetValue(current, out var parent) && parent is Guid p)
        {
            level++;
            current = p;
            if (level > 64) break; // cycle guard
        }
        return level;
    }

    private static bool IsDescendant(List<BomLine> lines, Guid ancestorId, Guid candidateId)
    {
        var lookup = lines.ToDictionary(l => l.Id, l => l.ParentId);
        var current = candidateId;
        var guard = 0;
        while (lookup.TryGetValue(current, out var parent) && parent is Guid p)
        {
            if (p == ancestorId) return true;
            current = p;
            if (++guard > 64) break;
        }
        return false;
    }

    private static void Touch(BomDocument document) => document.UpdatedAt = DateTimeOffset.UtcNow;

    private void AddAudit(Guid documentId, Guid? lineId, UserContext user,
        AuditChangeType type, string? field, string? oldValue, string? newValue)
    {
        db.BomAuditEntries.Add(new BomAuditEntry
        {
            Id = Guid.NewGuid(),
            BomDocumentId = documentId,
            BomLineId = lineId,
            Timestamp = DateTimeOffset.UtcNow,
            UserId = user.UserId,
            UserName = user.UserName,
            ChangeType = type,
            FieldName = field,
            OldValue = oldValue,
            NewValue = newValue
        });
    }

    private static BomLineFields ToFields(BomLine l) => new()
    {
        Action = l.Action,
        Position = l.Position,
        BsObjectId = l.BsObjectId,
        LegacySwingId = l.LegacySwingId,
        DrawingNo = l.DrawingNo,
        Description = l.Description,
        FinalQuantity = l.FinalQuantity,
        Constant = l.Constant,
        Class = l.Class,
        Uom = l.Uom,
        IsEbom = l.IsEbom,
        Phantom = l.Phantom,
        ReleaseTemplate = l.ReleaseTemplate,
        Conditions = l.Conditions,
        ConditionsPlm = l.ConditionsPlm,
        Formula = l.Formula,
        FormulaPlm = l.FormulaPlm,
        Route = l.Route,
        BomExplosion = l.BomExplosion,
        NoOfPiecesInPack = l.NoOfPiecesInPack,
        WeightKg = l.WeightKg,
        VolumeM3 = l.VolumeM3
    };

    private static void ApplyFields(BomLine line, BomLineFields f)
    {
        line.Action = f.Action;
        line.Position = f.Position;
        line.BsObjectId = f.BsObjectId;
        line.LegacySwingId = f.LegacySwingId;
        line.DrawingNo = f.DrawingNo;
        line.Description = f.Description;
        line.FinalQuantity = f.FinalQuantity;
        line.Constant = f.Constant;
        line.Class = f.Class;
        line.Uom = f.Uom;
        line.IsEbom = f.IsEbom;
        line.Phantom = f.Phantom;
        line.ReleaseTemplate = f.ReleaseTemplate;
        line.Conditions = f.Conditions;
        line.ConditionsPlm = f.ConditionsPlm;
        line.Formula = f.Formula;
        line.FormulaPlm = f.FormulaPlm;
        line.Route = f.Route;
        line.BomExplosion = f.BomExplosion;
        line.NoOfPiecesInPack = f.NoOfPiecesInPack;
        line.WeightKg = f.WeightKg;
        line.VolumeM3 = f.VolumeM3;
    }

    private static IEnumerable<(string Field, string? Old, string? New)> DiffFields(BomLine line, BomLineFields f)
    {
        if (line.Action != f.Action) yield return (nameof(f.Action), line.Action.ToString(), f.Action.ToString());
        if (line.Position != f.Position) yield return (nameof(f.Position), line.Position, f.Position);
        if (line.BsObjectId != f.BsObjectId) yield return (nameof(f.BsObjectId), line.BsObjectId, f.BsObjectId);
        if (line.LegacySwingId != f.LegacySwingId) yield return (nameof(f.LegacySwingId), line.LegacySwingId, f.LegacySwingId);
        if (line.DrawingNo != f.DrawingNo) yield return (nameof(f.DrawingNo), line.DrawingNo, f.DrawingNo);
        if (line.Description != f.Description) yield return (nameof(f.Description), line.Description, f.Description);
        if (line.FinalQuantity != f.FinalQuantity) yield return (nameof(f.FinalQuantity), line.FinalQuantity, f.FinalQuantity);
        if (line.Constant != f.Constant) yield return (nameof(f.Constant), line.Constant, f.Constant);
        if (line.Class != f.Class) yield return (nameof(f.Class), line.Class, f.Class);
        if (line.Uom != f.Uom) yield return (nameof(f.Uom), line.Uom, f.Uom);
        if (line.IsEbom != f.IsEbom) yield return (nameof(f.IsEbom), line.IsEbom.ToString(), f.IsEbom.ToString());
        if (line.Phantom != f.Phantom) yield return (nameof(f.Phantom), line.Phantom.ToString(), f.Phantom.ToString());
        if (line.ReleaseTemplate != f.ReleaseTemplate) yield return (nameof(f.ReleaseTemplate), line.ReleaseTemplate, f.ReleaseTemplate);
        if (line.Conditions != f.Conditions) yield return (nameof(f.Conditions), line.Conditions, f.Conditions);
        if (line.ConditionsPlm != f.ConditionsPlm) yield return (nameof(f.ConditionsPlm), line.ConditionsPlm, f.ConditionsPlm);
        if (line.Formula != f.Formula) yield return (nameof(f.Formula), line.Formula, f.Formula);
        if (line.FormulaPlm != f.FormulaPlm) yield return (nameof(f.FormulaPlm), line.FormulaPlm, f.FormulaPlm);
        if (line.Route != f.Route) yield return (nameof(f.Route), line.Route, f.Route);
        if (line.BomExplosion != f.BomExplosion) yield return (nameof(f.BomExplosion), line.BomExplosion, f.BomExplosion);
        if (line.NoOfPiecesInPack != f.NoOfPiecesInPack) yield return (nameof(f.NoOfPiecesInPack), line.NoOfPiecesInPack, f.NoOfPiecesInPack);
        if (line.WeightKg != f.WeightKg) yield return (nameof(f.WeightKg), line.WeightKg, f.WeightKg);
        if (line.VolumeM3 != f.VolumeM3) yield return (nameof(f.VolumeM3), line.VolumeM3, f.VolumeM3);
    }

    private static BomLineDto ToDto(BomLine l, int level) => new()
    {
        Id = l.Id,
        ParentId = l.ParentId,
        SortOrder = l.SortOrder,
        Level = level,
        IsDeleted = l.IsDeleted,
        ConcurrencyStamp = l.ConcurrencyStamp,
        Action = l.Action,
        Position = l.Position,
        BsObjectId = l.BsObjectId,
        LegacySwingId = l.LegacySwingId,
        DrawingNo = l.DrawingNo,
        Description = l.Description,
        FinalQuantity = l.FinalQuantity,
        Constant = l.Constant,
        Class = l.Class,
        Uom = l.Uom,
        IsEbom = l.IsEbom,
        Phantom = l.Phantom,
        ReleaseTemplate = l.ReleaseTemplate,
        Conditions = l.Conditions,
        ConditionsPlm = l.ConditionsPlm,
        Formula = l.Formula,
        FormulaPlm = l.FormulaPlm,
        Route = l.Route,
        BomExplosion = l.BomExplosion,
        NoOfPiecesInPack = l.NoOfPiecesInPack,
        WeightKg = l.WeightKg,
        VolumeM3 = l.VolumeM3
    };
}
