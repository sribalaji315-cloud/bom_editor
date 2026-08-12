using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using Haworth.BOMeditor.Api.Csv;
using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;
using Route = Haworth.BOMeditor.Core.Domain.Route;

namespace Haworth.BOMeditor.Api.Services;

/// <summary>
/// Owns validation, persistence orchestration, and audit logging for routes and their operations.
/// Endpoints must go through this service and never touch <see cref="AppDbContext"/> directly.
/// </summary>
public class RouteService(AppDbContext db) : IRouteService
{
    public async Task<IReadOnlyList<RouteSummaryDto>> GetRoutesAsync(CancellationToken ct = default)
    {
        return await db.Routes
            .OrderBy(r => r.Code)
            .Select(r => new RouteSummaryDto(
                r.Id, r.Code, r.Name, r.RouteNumber, r.Operations.Count,
                r.IsActive, r.CreatedAt, r.CreatedBy, r.UpdatedAt))
            .ToListAsync(ct);
    }

    public async Task<RouteDetailDto?> GetRouteAsync(Guid routeId, CancellationToken ct = default)
    {
        var route = await db.Routes.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == routeId, ct);
        if (route is null) return null;

        var operations = await db.RouteOperations.AsNoTracking()
            .Where(o => o.RouteId == routeId)
            .OrderBy(o => o.SortOrder)
            .ToListAsync(ct);

        return ToDetail(route, operations);
    }

    public async Task<IReadOnlyList<string>> GetActiveCodesAsync(CancellationToken ct = default)
    {
        return await db.Routes
            .Where(r => r.IsActive)
            .OrderBy(r => r.Code)
            .Select(r => r.Code)
            .ToListAsync(ct);
    }

    public async Task<RouteDetailDto> CreateRouteAsync(
        CreateRouteRequest request, UserContext user, CancellationToken ct = default)
    {
        var code = (request.Code ?? string.Empty).Trim();
        if (code.Length == 0)
            throw new InvalidOperationException("Route code is required.");
        if (await CodeExistsAsync(code, null, ct))
            throw new InvalidOperationException($"A route with code '{code}' already exists.");

        var now = DateTimeOffset.UtcNow;
        var route = new Route
        {
            Id = Guid.NewGuid(),
            CreatedAt = now,
            UpdatedAt = now,
            CreatedBy = user.UserName
        };
        ApplyHeader(route, request with { Code = code });

        db.Routes.Add(route);
        AddAudit(route.Id, null, user, AuditChangeType.Create, "Route", null, route.Code);
        await db.SaveChangesAsync(ct);

        return ToDetail(route, []);
    }

    public async Task<RouteDetailDto?> UpdateRouteAsync(
        Guid routeId, UpdateRouteRequest request, UserContext user, CancellationToken ct = default)
    {
        var route = await db.Routes.FirstOrDefaultAsync(r => r.Id == routeId, ct);
        if (route is null) return null;

        var code = (request.Code ?? string.Empty).Trim();
        if (code.Length == 0)
            throw new InvalidOperationException("Route code is required.");
        if (await CodeExistsAsync(code, routeId, ct))
            throw new InvalidOperationException($"A route with code '{code}' already exists.");

        var normalized = request with { Code = code };
        foreach (var change in DiffHeader(route, normalized))
            AddAudit(routeId, null, user, AuditChangeType.Update, change.Field, change.Old, change.New);

        ApplyHeader(route, normalized);
        Touch(route);
        await db.SaveChangesAsync(ct);

        var operations = await db.RouteOperations
            .Where(o => o.RouteId == routeId)
            .OrderBy(o => o.SortOrder)
            .ToListAsync(ct);
        return ToDetail(route, operations);
    }

    public async Task<bool> DeleteRouteAsync(Guid routeId, UserContext user, CancellationToken ct = default)
    {
        var route = await db.Routes.FirstOrDefaultAsync(r => r.Id == routeId, ct);
        if (route is null) return false;

        var operations = await db.RouteOperations.Where(o => o.RouteId == routeId).ToListAsync(ct);
        db.RouteOperations.RemoveRange(operations);
        db.Routes.Remove(route);
        AddAudit(routeId, null, user, AuditChangeType.Delete, "Route", route.Code, null);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<RouteOperationDto> CreateOperationAsync(
        Guid routeId, CreateRouteOperationRequest request, UserContext user, CancellationToken ct = default)
    {
        var route = await db.Routes.FirstOrDefaultAsync(r => r.Id == routeId, ct)
            ?? throw new KeyNotFoundException("Route not found.");

        var sortOrder = request.SortOrder ?? await NextSortOrderAsync(routeId, ct);
        var operation = new RouteOperation
        {
            Id = Guid.NewGuid(),
            RouteId = routeId,
            SortOrder = sortOrder
        };
        ApplyOperation(operation, request);

        db.RouteOperations.Add(operation);
        AddAudit(routeId, operation.Id, user, AuditChangeType.Create, "Operation", null,
            operation.OperationNo ?? operation.Description);
        Touch(route);
        await db.SaveChangesAsync(ct);

        return ToOperationDto(operation);
    }

    public async Task<RouteOperationDto?> UpdateOperationAsync(
        Guid routeId, Guid operationId, UpdateRouteOperationRequest request, UserContext user, CancellationToken ct = default)
    {
        var operation = await db.RouteOperations.FirstOrDefaultAsync(
            o => o.Id == operationId && o.RouteId == routeId, ct);
        if (operation is null) return null;

        foreach (var change in DiffOperation(operation, request))
            AddAudit(routeId, operationId, user, AuditChangeType.Update, change.Field, change.Old, change.New);

        ApplyOperation(operation, request);
        var route = await db.Routes.FirstAsync(r => r.Id == routeId, ct);
        Touch(route);
        await db.SaveChangesAsync(ct);

        return ToOperationDto(operation);
    }

    public async Task<bool> DeleteOperationAsync(
        Guid routeId, Guid operationId, UserContext user, CancellationToken ct = default)
    {
        var operation = await db.RouteOperations.FirstOrDefaultAsync(
            o => o.Id == operationId && o.RouteId == routeId, ct);
        if (operation is null) return false;

        db.RouteOperations.Remove(operation);
        AddAudit(routeId, operationId, user, AuditChangeType.Delete, "Operation",
            operation.OperationNo ?? operation.Description, null);
        var route = await db.Routes.FirstAsync(r => r.Id == routeId, ct);
        Touch(route);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> MoveOperationAsync(
        Guid routeId, Guid operationId, MoveRouteOperationRequest request, UserContext user, CancellationToken ct = default)
    {
        var operation = await db.RouteOperations.FirstOrDefaultAsync(
            o => o.Id == operationId && o.RouteId == routeId, ct);
        if (operation is null) return false;

        var oldSortOrder = operation.SortOrder;
        if (oldSortOrder != request.SortOrder)
        {
            operation.SortOrder = request.SortOrder;
            AddAudit(routeId, operationId, user, AuditChangeType.Move, "Position",
                oldSortOrder.ToString(), request.SortOrder.ToString());
            var route = await db.Routes.FirstAsync(r => r.Id == routeId, ct);
            Touch(route);
            await db.SaveChangesAsync(ct);
        }
        return true;
    }

    public async Task<IReadOnlyList<RouteAuditEntryDto>> GetAuditAsync(Guid routeId, CancellationToken ct = default)
    {
        return await db.RouteAuditEntries.AsNoTracking()
            .Where(a => a.RouteId == routeId)
            .OrderByDescending(a => a.Timestamp)
            .Select(a => new RouteAuditEntryDto(
                a.Id, a.RouteOperationId, a.Timestamp, a.UserName, a.ChangeType,
                a.FieldName, a.OldValue, a.NewValue))
            .ToListAsync(ct);
    }

    public async Task<byte[]?> ExportAsync(Guid routeId, CancellationToken ct = default)
    {
        var route = await db.Routes.AsNoTracking().FirstOrDefaultAsync(r => r.Id == routeId, ct);
        if (route is null) return null;

        var operations = await db.RouteOperations.AsNoTracking()
            .Where(o => o.RouteId == routeId)
            .OrderBy(o => o.SortOrder)
            .ToListAsync(ct);

        using var buffer = new MemoryStream();
        using (var writer = new StreamWriter(buffer, new UTF8Encoding(false), leaveOpen: true))
        using (var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)))
        {
            foreach (var header in RouteCsvColumns.Header)
                csv.WriteField(header);
            await csv.NextRecordAsync();

            // A route with no operations still emits one header row so it round-trips.
            if (operations.Count == 0)
            {
                WriteRow(csv, route, null, isFirst: true);
                await csv.NextRecordAsync();
            }
            else
            {
                for (var i = 0; i < operations.Count; i++)
                {
                    WriteRow(csv, route, operations[i], isFirst: i == 0);
                    await csv.NextRecordAsync();
                }
            }
        }

        return buffer.ToArray();
    }

    // ---- helpers ----------------------------------------------------------

    private Task<bool> CodeExistsAsync(string code, Guid? excludingId, CancellationToken ct) =>
        db.Routes.AnyAsync(r =>
            r.Code.ToLower() == code.ToLower() && (excludingId == null || r.Id != excludingId), ct);

    private async Task<int> NextSortOrderAsync(Guid routeId, CancellationToken ct)
    {
        var max = await db.RouteOperations
            .Where(o => o.RouteId == routeId)
            .MaxAsync(o => (int?)o.SortOrder, ct);
        return (max ?? -1) + 1;
    }

    private static void Touch(Route route) => route.UpdatedAt = DateTimeOffset.UtcNow;

    private void AddAudit(Guid routeId, Guid? operationId, UserContext user,
        AuditChangeType type, string? field, string? oldValue, string? newValue)
    {
        db.RouteAuditEntries.Add(new RouteAuditEntry
        {
            Id = Guid.NewGuid(),
            RouteId = routeId,
            RouteOperationId = operationId,
            Timestamp = DateTimeOffset.UtcNow,
            UserId = user.UserId,
            UserName = user.UserName,
            ChangeType = type,
            FieldName = field,
            OldValue = oldValue,
            NewValue = newValue
        });
    }

    private static void ApplyHeader(Route route, RouteHeaderFields f)
    {
        route.Code = f.Code;
        route.RouteNumber = f.RouteNumber;
        route.Name = f.Name;
        route.IsActive = f.IsActive;
    }

    private static IEnumerable<(string Field, string? Old, string? New)> DiffHeader(Route route, RouteHeaderFields f)
    {
        if (route.Code != f.Code) yield return (nameof(f.Code), route.Code, f.Code);
        if (route.RouteNumber != f.RouteNumber) yield return (nameof(f.RouteNumber), route.RouteNumber, f.RouteNumber);
        if (route.Name != f.Name) yield return (nameof(f.Name), route.Name, f.Name);
        if (route.IsActive != f.IsActive) yield return (nameof(f.IsActive), route.IsActive.ToString(), f.IsActive.ToString());
    }

    private static void ApplyOperation(RouteOperation o, RouteOperationFields f)
    {
        o.OperationNo = f.OperationNo;
        o.OperationId = f.OperationId;
        o.Description = f.Description;
        o.DescriptionLen = f.DescriptionLen;
        o.NextOperation = f.NextOperation;
        o.SwingWc = f.SwingWc;
        o.RuntimeType = f.RuntimeType;
        o.SetUpTime = f.SetUpTime;
        o.Time = f.Time;
        o.ResourceId = f.ResourceId;
        o.ResourceGroup = f.ResourceGroup;
        o.RouteGroupId = f.RouteGroupId;
        o.Priority = f.Priority;
        o.Condition = f.Condition;
        o.ConditionPlm = f.ConditionPlm;
        o.Formula = f.Formula;
        o.FormulaPlm = f.FormulaPlm;
    }

    private static IEnumerable<(string Field, string? Old, string? New)> DiffOperation(RouteOperation o, RouteOperationFields f)
    {
        if (o.OperationNo != f.OperationNo) yield return (nameof(f.OperationNo), o.OperationNo, f.OperationNo);
        if (o.OperationId != f.OperationId) yield return (nameof(f.OperationId), o.OperationId, f.OperationId);
        if (o.Description != f.Description) yield return (nameof(f.Description), o.Description, f.Description);
        if (o.DescriptionLen != f.DescriptionLen) yield return (nameof(f.DescriptionLen), o.DescriptionLen, f.DescriptionLen);
        if (o.NextOperation != f.NextOperation) yield return (nameof(f.NextOperation), o.NextOperation, f.NextOperation);
        if (o.SwingWc != f.SwingWc) yield return (nameof(f.SwingWc), o.SwingWc, f.SwingWc);
        if (o.RuntimeType != f.RuntimeType) yield return (nameof(f.RuntimeType), o.RuntimeType, f.RuntimeType);
        if (o.SetUpTime != f.SetUpTime) yield return (nameof(f.SetUpTime), o.SetUpTime, f.SetUpTime);
        if (o.Time != f.Time) yield return (nameof(f.Time), o.Time, f.Time);
        if (o.ResourceId != f.ResourceId) yield return (nameof(f.ResourceId), o.ResourceId, f.ResourceId);
        if (o.ResourceGroup != f.ResourceGroup) yield return (nameof(f.ResourceGroup), o.ResourceGroup, f.ResourceGroup);
        if (o.RouteGroupId != f.RouteGroupId) yield return (nameof(f.RouteGroupId), o.RouteGroupId, f.RouteGroupId);
        if (o.Priority != f.Priority) yield return (nameof(f.Priority), o.Priority, f.Priority);
        if (o.Condition != f.Condition) yield return (nameof(f.Condition), o.Condition, f.Condition);
        if (o.ConditionPlm != f.ConditionPlm) yield return (nameof(f.ConditionPlm), o.ConditionPlm, f.ConditionPlm);
        if (o.Formula != f.Formula) yield return (nameof(f.Formula), o.Formula, f.Formula);
        if (o.FormulaPlm != f.FormulaPlm) yield return (nameof(f.FormulaPlm), o.FormulaPlm, f.FormulaPlm);
    }

    // Header identity columns are written only on a route's first row (matching the source layout).
    private static void WriteRow(CsvWriter csv, Route route, RouteOperation? op, bool isFirst)
    {
        csv.WriteField(isFirst ? route.Code : string.Empty);
        csv.WriteField(isFirst ? route.RouteNumber ?? string.Empty : string.Empty);
        csv.WriteField(isFirst ? route.Name ?? string.Empty : string.Empty);
        csv.WriteField(op?.OperationNo ?? string.Empty);
        csv.WriteField(op?.OperationId ?? string.Empty);
        csv.WriteField(op?.Description ?? string.Empty);
        csv.WriteField(op?.DescriptionLen ?? string.Empty);
        csv.WriteField(op?.NextOperation ?? string.Empty);
        csv.WriteField(op?.SwingWc ?? string.Empty);
        csv.WriteField(op?.RuntimeType ?? string.Empty);
        csv.WriteField(op?.SetUpTime ?? string.Empty);
        csv.WriteField(op?.Time ?? string.Empty);
        csv.WriteField(op?.ResourceId ?? string.Empty);
        csv.WriteField(op?.ResourceGroup ?? string.Empty);
        csv.WriteField(op?.RouteGroupId ?? string.Empty);
        csv.WriteField(op?.Priority ?? string.Empty);
        csv.WriteField(op?.Condition ?? string.Empty);
        csv.WriteField(op?.Formula ?? string.Empty);
        csv.WriteField(op?.ConditionPlm ?? string.Empty);
        csv.WriteField(op?.FormulaPlm ?? string.Empty);
    }

    private static RouteDetailDto ToDetail(Route route, IReadOnlyList<RouteOperation> operations) => new()
    {
        Id = route.Id,
        Code = route.Code,
        RouteNumber = route.RouteNumber,
        Name = route.Name,
        IsActive = route.IsActive,
        CreatedAt = route.CreatedAt,
        CreatedBy = route.CreatedBy,
        UpdatedAt = route.UpdatedAt,
        Operations = operations.Select(ToOperationDto).ToList()
    };

    private static RouteOperationDto ToOperationDto(RouteOperation o) => new()
    {
        Id = o.Id,
        SortOrder = o.SortOrder,
        OperationNo = o.OperationNo,
        OperationId = o.OperationId,
        Description = o.Description,
        DescriptionLen = o.DescriptionLen,
        NextOperation = o.NextOperation,
        SwingWc = o.SwingWc,
        RuntimeType = o.RuntimeType,
        SetUpTime = o.SetUpTime,
        Time = o.Time,
        ResourceId = o.ResourceId,
        ResourceGroup = o.ResourceGroup,
        RouteGroupId = o.RouteGroupId,
        Priority = o.Priority,
        Condition = o.Condition,
        ConditionPlm = o.ConditionPlm,
        Formula = o.Formula,
        FormulaPlm = o.FormulaPlm
    };
}
