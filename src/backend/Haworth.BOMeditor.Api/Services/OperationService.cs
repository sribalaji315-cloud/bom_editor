using Haworth.BOMeditor.Core.Domain;
using Haworth.BOMeditor.Core.Dtos;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Microsoft.EntityFrameworkCore;

namespace Haworth.BOMeditor.Api.Services;

public class OperationService(AppDbContext db) : IOperationService
{
    public async Task<IReadOnlyList<OperationDto>> GetAllAsync(CancellationToken ct = default)
    {
        var operations = await db.Operations.AsNoTracking().OrderBy(o => o.Code).ToListAsync(ct);
        return operations.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<OperationOptionDto>> GetSelectableAsync(CancellationToken ct = default) =>
        await db.Operations
            .Where(o => o.Status == OperationStatus.Approved && o.IsActive)
            .OrderBy(o => o.Code)
            .Select(o => new OperationOptionDto(o.Code, o.Description))
            .ToListAsync(ct);

    public async Task<OperationDto> CreateAsync(CreateOperationRequest request, CancellationToken ct = default)
    {
        var (code, description) = Validate(request.Code, request.Description);
        await EnsureCodeAvailableAsync(code, null, ct);

        var now = DateTimeOffset.UtcNow;
        var operation = new Operation
        {
            Id = Guid.NewGuid(),
            Code = code,
            Description = description,
            Status = OperationStatus.Approved,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Operations.Add(operation);
        await db.SaveChangesAsync(ct);
        return ToDto(operation);
    }

    public async Task<OperationDto> RequestAsync(
        RequestOperationRequest request, UserContext user, CancellationToken ct = default)
    {
        var (code, description) = Validate(request.Code, request.Description);

        var clash = await db.Operations.FirstOrDefaultAsync(o => o.Code.ToLower() == code.ToLower(), ct);
        if (clash is not null)
        {
            throw new InvalidOperationException(clash.Status == OperationStatus.Requested
                ? $"Operation '{code}' has already been requested and is awaiting review."
                : $"An operation with code '{code}' already exists.");
        }

        var now = DateTimeOffset.UtcNow;
        var operation = new Operation
        {
            Id = Guid.NewGuid(),
            Code = code,
            Description = description,
            Status = OperationStatus.Requested,
            IsActive = true,
            RequestReason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
            RequestedBy = user.UserName,
            RequestedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Operations.Add(operation);
        await db.SaveChangesAsync(ct);
        return ToDto(operation);
    }

    public async Task<OperationDto> UpdateAsync(
        Guid id, UpdateOperationRequest request, CancellationToken ct = default)
    {
        var operation = await FindAsync(id, ct);
        var (code, description) = Validate(request.Code, request.Description);
        await EnsureCodeAvailableAsync(code, id, ct);

        operation.Code = code;
        operation.Description = description;
        operation.IsActive = request.IsActive;
        operation.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return ToDto(operation);
    }

    public async Task<OperationDto> ApproveAsync(
        Guid id, ReviewOperationRequest request, UserContext user, CancellationToken ct = default)
    {
        var operation = await FindAsync(id, ct);
        var (code, description) = Validate(
            request.Code ?? operation.Code, request.Description ?? operation.Description);
        await EnsureCodeAvailableAsync(code, id, ct);

        var now = DateTimeOffset.UtcNow;
        operation.Code = code;
        operation.Description = description;
        operation.Status = OperationStatus.Approved;
        operation.IsActive = true;
        operation.ReviewedBy = user.UserName;
        operation.ReviewedAt = now;
        operation.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        return ToDto(operation);
    }

    public async Task<OperationDto> RejectAsync(Guid id, UserContext user, CancellationToken ct = default)
    {
        var operation = await FindAsync(id, ct);
        var now = DateTimeOffset.UtcNow;
        operation.Status = OperationStatus.Rejected;
        operation.IsActive = false;
        operation.ReviewedBy = user.UserName;
        operation.ReviewedAt = now;
        operation.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        return ToDto(operation);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var operation = await FindAsync(id, ct);
        db.Operations.Remove(operation);
        await db.SaveChangesAsync(ct);
    }

    private async Task<Operation> FindAsync(Guid id, CancellationToken ct) =>
        await db.Operations.FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Operation not found.");

    private static (string Code, string Description) Validate(string? code, string? description)
    {
        var trimmedCode = code?.Trim() ?? string.Empty;
        if (trimmedCode.Length == 0)
            throw new InvalidOperationException("Operation ID is required.");

        var trimmedDescription = description?.Trim() ?? string.Empty;
        if (trimmedDescription.Length == 0)
            throw new InvalidOperationException("Description is required.");

        return (trimmedCode, trimmedDescription);
    }

    private async Task EnsureCodeAvailableAsync(string code, Guid? excludingId, CancellationToken ct)
    {
        var exists = await db.Operations
            .AnyAsync(o => o.Id != excludingId && o.Code.ToLower() == code.ToLower(), ct);
        if (exists)
            throw new InvalidOperationException($"An operation with code '{code}' already exists.");
    }

    private static OperationDto ToDto(Operation o) => new(
        o.Id, o.Code, o.Description, o.Status, o.IsActive,
        o.RequestReason, o.RequestedBy, o.RequestedAt, o.ReviewedBy, o.ReviewedAt);
}
