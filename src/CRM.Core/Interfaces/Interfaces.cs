using CRM.Core.Models;

namespace CRM.Core.Interfaces;

public interface ICRMAdapter
{
    Task LoginAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Customer>> PullCustomersAsync(DateTime? changedAfter, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Subscription>> PullSubscriptionsAsync(DateTime? changedAfter, CancellationToken cancellationToken);
}

public interface ICredentialVault
{
    Task<(string Username, string Password)> GetCredentialsAsync(string key, CancellationToken cancellationToken);
}

public interface ICRMRepository
{
    Task UpsertCustomersAsync(IReadOnlyCollection<Customer> customers, CancellationToken cancellationToken);
    Task UpsertSubscriptionsAsync(IReadOnlyCollection<Subscription> subscriptions, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ExpiredSubscriptionReportRow>> GetExpiredSubscriptionsAsync(int minDays, CancellationToken cancellationToken);
    Task<SyncRun?> GetLastSuccessfulSyncAsync(CancellationToken cancellationToken);
    Task RecordSyncRunAsync(SyncRun run, CancellationToken cancellationToken);
}
