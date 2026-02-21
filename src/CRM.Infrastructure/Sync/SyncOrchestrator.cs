using CRM.Core.Interfaces;
using CRM.Core.Models;
using Microsoft.Extensions.Logging;

namespace CRM.Infrastructure.Sync;

public sealed class SyncOrchestrator(
    ICRMAdapter crmAdapter,
    ICRMRepository repository,
    ILogger<SyncOrchestrator> logger)
{
    public async Task RunIncrementalAsync(CancellationToken cancellationToken)
    {
        var previous = await repository.GetLastSuccessfulSyncAsync(cancellationToken);
        var syncRun = new SyncRun
        {
            Id = Guid.NewGuid().ToString("N"),
            StartedAt = DateTime.UtcNow,
            CursorDate = previous?.CursorDate ?? previous?.FinishedAt,
            Mode = previous is null ? "full" : "incremental"
        };

        try
        {
            await crmAdapter.LoginAsync(cancellationToken);
            var customers = await crmAdapter.PullCustomersAsync(syncRun.CursorDate, cancellationToken);
            var subscriptions = await crmAdapter.PullSubscriptionsAsync(syncRun.CursorDate, cancellationToken);

            await repository.UpsertCustomersAsync(customers, cancellationToken);
            await repository.UpsertSubscriptionsAsync(subscriptions, cancellationToken);

            syncRun = syncRun with
            {
                FinishedAt = DateTime.UtcNow,
                RecordsRead = customers.Count + subscriptions.Count,
                RecordsWritten = customers.Count + subscriptions.Count,
                Status = "success",
                CursorDate = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Incremental sync failed.");
            syncRun = syncRun with { FinishedAt = DateTime.UtcNow, Status = "failed", Error = ex.Message };
        }

        await repository.RecordSyncRunAsync(syncRun, cancellationToken);
    }
}
