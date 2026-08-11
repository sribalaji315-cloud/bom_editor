using System.Globalization;
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
/// Parses a ROUTE TEMPLATE CSV. A row whose ROUTE column is non-empty starts a new route;
/// subsequent rows with an empty ROUTE column add operations to the current route; fully empty
/// rows are separators. Routes are upserted by code (an existing route's operations are replaced).
/// </summary>
public class RouteImportService(AppDbContext db) : IRouteImportService
{
    public async Task<RouteImportResultDto> ImportAsync(
        Stream csv, string fileName, UserContext user, CancellationToken ct = default)
    {
        var parsed = Parse(await ReadRecordsAsync(csv, ct));

        var created = 0;
        var updated = 0;
        var totalOperations = 0;
        var now = DateTimeOffset.UtcNow;

        foreach (var parsedRoute in parsed)
        {
            var existing = await db.Routes
                .FirstOrDefaultAsync(r => r.Code.ToLower() == parsedRoute.Code.ToLower(), ct);

            if (existing is null)
            {
                var route = new Route
                {
                    Id = Guid.NewGuid(),
                    Code = parsedRoute.Code,
                    CreatedAt = now,
                    UpdatedAt = now,
                    CreatedBy = user.UserName
                };
                ApplyHeader(route, parsedRoute);
                route.Operations = BuildOperations(route.Id, parsedRoute);
                db.Routes.Add(route);
                AddAudit(route.Id, user, AuditChangeType.Create, $"{fileName} ({route.Operations.Count} operation(s))");
                created++;
                totalOperations += route.Operations.Count;
            }
            else
            {
                ApplyHeader(existing, parsedRoute);
                existing.UpdatedAt = now;

                var oldOps = await db.RouteOperations.Where(o => o.RouteId == existing.Id).ToListAsync(ct);
                db.RouteOperations.RemoveRange(oldOps);
                var newOps = BuildOperations(existing.Id, parsedRoute);
                await db.RouteOperations.AddRangeAsync(newOps, ct);
                AddAudit(existing.Id, user, AuditChangeType.Update, $"{fileName} ({newOps.Count} operation(s))");
                updated++;
                totalOperations += newOps.Count;
            }
        }

        await db.SaveChangesAsync(ct);
        return new RouteImportResultDto(created, updated, totalOperations);
    }

    private static async Task<List<string[]>> ReadRecordsAsync(Stream csv, CancellationToken ct)
    {
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            BadDataFound = null,
            TrimOptions = TrimOptions.Trim
        };

        using var reader = new StreamReader(csv);
        using var parser = new CsvParser(reader, config);

        await parser.ReadAsync(); // skip header

        var records = new List<string[]>();
        while (await parser.ReadAsync())
        {
            ct.ThrowIfCancellationRequested();
            if (parser.Record is { } record) records.Add(record);
        }
        return records;
    }

    private static List<ParsedRoute> Parse(IReadOnlyList<string[]> records)
    {
        var routes = new List<ParsedRoute>();
        ParsedRoute? current = null;

        foreach (var record in records)
        {
            var code = Field(record, RouteCsvColumns.Route);
            if (code is not null)
            {
                current = new ParsedRoute
                {
                    Code = code,
                    RouteNumber = Field(record, RouteCsvColumns.RouteNumber),
                    Name = Field(record, RouteCsvColumns.RouteName)
                };
                routes.Add(current);
            }

            if (current is null) continue;

            if (HasOperation(record))
                current.Operations.Add(ReadOperation(record));
        }

        return routes;
    }

    private static bool HasOperation(string[] record) =>
        Field(record, RouteCsvColumns.OperationNo) is not null
        || Field(record, RouteCsvColumns.OperationId) is not null
        || Field(record, RouteCsvColumns.OperationDescription) is not null;

    private static ParsedOperation ReadOperation(string[] record) => new()
    {
        OperationNo = Field(record, RouteCsvColumns.OperationNo),
        OperationId = Field(record, RouteCsvColumns.OperationId),
        Description = Field(record, RouteCsvColumns.OperationDescription),
        DescriptionLen = Field(record, RouteCsvColumns.DescriptionLen),
        NextOperation = Field(record, RouteCsvColumns.NextOperation),
        SwingWc = Field(record, RouteCsvColumns.SwingWc),
        RuntimeType = Field(record, RouteCsvColumns.RuntimeType),
        SetUpTime = Field(record, RouteCsvColumns.SetUpTime),
        Time = Field(record, RouteCsvColumns.Time),
        ResourceId = Field(record, RouteCsvColumns.ResourceId),
        ResourceGroup = Field(record, RouteCsvColumns.ResourceGroup),
        RouteGroupId = Field(record, RouteCsvColumns.RouteGroupId),
        Priority = Field(record, RouteCsvColumns.Priority),
        Condition = Field(record, RouteCsvColumns.RouteCondition),
        Formula = Field(record, RouteCsvColumns.RouteFormula)
    };

    private static List<RouteOperation> BuildOperations(Guid routeId, ParsedRoute parsed)
    {
        var operations = new List<RouteOperation>();
        for (var i = 0; i < parsed.Operations.Count; i++)
        {
            var p = parsed.Operations[i];
            operations.Add(new RouteOperation
            {
                Id = Guid.NewGuid(),
                RouteId = routeId,
                SortOrder = i,
                OperationNo = p.OperationNo,
                OperationId = p.OperationId,
                Description = p.Description,
                DescriptionLen = p.DescriptionLen,
                NextOperation = p.NextOperation,
                SwingWc = p.SwingWc,
                RuntimeType = p.RuntimeType,
                SetUpTime = p.SetUpTime,
                Time = p.Time,
                ResourceId = p.ResourceId,
                ResourceGroup = p.ResourceGroup,
                RouteGroupId = p.RouteGroupId,
                Priority = p.Priority,
                Condition = p.Condition,
                Formula = p.Formula
            });
        }
        return operations;
    }

    private static void ApplyHeader(Route route, ParsedRoute parsed)
    {
        route.Code = parsed.Code;
        route.RouteNumber = parsed.RouteNumber;
        route.Name = parsed.Name;
    }

    private void AddAudit(Guid routeId, UserContext user, AuditChangeType type, string newValue)
    {
        db.RouteAuditEntries.Add(new RouteAuditEntry
        {
            Id = Guid.NewGuid(),
            RouteId = routeId,
            Timestamp = DateTimeOffset.UtcNow,
            UserId = user.UserId,
            UserName = user.UserName,
            ChangeType = type,
            FieldName = "Import",
            NewValue = newValue
        });
    }

    private static string? Field(string[] record, int index)
    {
        if (index >= record.Length) return null;
        var value = record[index];
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private sealed class ParsedRoute
    {
        public required string Code { get; init; }
        public string? RouteNumber { get; init; }
        public string? Name { get; init; }
        public List<ParsedOperation> Operations { get; } = [];
    }

    private sealed class ParsedOperation
    {
        public string? OperationNo { get; init; }
        public string? OperationId { get; init; }
        public string? Description { get; init; }
        public string? DescriptionLen { get; init; }
        public string? NextOperation { get; init; }
        public string? SwingWc { get; init; }
        public string? RuntimeType { get; init; }
        public string? SetUpTime { get; init; }
        public string? Time { get; init; }
        public string? ResourceId { get; init; }
        public string? ResourceGroup { get; init; }
        public string? RouteGroupId { get; init; }
        public string? Priority { get; init; }
        public string? Condition { get; init; }
        public string? Formula { get; init; }
    }
}
