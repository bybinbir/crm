namespace CRM.Core.Models;

public record Customer
{
    public string Id { get; init; } = string.Empty;
    public string ExternalId { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string NationalId { get; init; } = string.Empty;
    public string District { get; init; } = string.Empty;
    public string Neighborhood { get; init; } = string.Empty;
    public string Status { get; init; } = "active";
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; init; } = DateTime.UtcNow;
    public string Fingerprint { get; init; } = string.Empty;
}

public record Subscription
{
    public string Id { get; init; } = string.Empty;
    public string CustomerId { get; init; } = string.Empty;
    public string PlanCode { get; init; } = string.Empty;
    public decimal MonthlyPrice { get; init; }
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public string Status { get; init; } = "active";
    public DateTime UpdatedAt { get; init; } = DateTime.UtcNow;
    public string Fingerprint { get; init; } = string.Empty;
}

public record Invoice
{
    public string Id { get; init; } = string.Empty;
    public string CustomerId { get; init; } = string.Empty;
    public string SubscriptionId { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public DateTime DueDate { get; init; }
    public string Status { get; init; } = "unpaid";
    public DateTime UpdatedAt { get; init; } = DateTime.UtcNow;
}

public record Ticket
{
    public string Id { get; init; } = string.Empty;
    public string CustomerId { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string Priority { get; init; } = "medium";
    public string Status { get; init; } = "open";
    public DateTime OpenedAt { get; init; }
    public DateTime UpdatedAt { get; init; } = DateTime.UtcNow;
}

public record SyncRun
{
    public string Id { get; init; } = string.Empty;
    public string Source { get; init; } = "crm-ui";
    public DateTime StartedAt { get; init; } = DateTime.UtcNow;
    public DateTime? FinishedAt { get; init; }
    public string Mode { get; init; } = "incremental";
    public int RecordsRead { get; init; }
    public int RecordsWritten { get; init; }
    public string Status { get; init; } = "running";
    public string Error { get; init; } = string.Empty;
    public DateTime? CursorDate { get; init; }
}
