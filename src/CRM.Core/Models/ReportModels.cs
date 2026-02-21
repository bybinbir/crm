namespace CRM.Core.Models;

public record ExpiredSubscriptionReportRow(
    string CustomerId,
    string CustomerName,
    string PlanCode,
    DateTime EndDate,
    int DaysExpired,
    string District,
    string Status);
