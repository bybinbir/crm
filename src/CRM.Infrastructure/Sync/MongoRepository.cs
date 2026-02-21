using CRM.Core.Interfaces;
using CRM.Core.Models;
using CRM.Infrastructure.Config;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CRM.Infrastructure.Sync;

public sealed class MongoRepository : ICRMRepository
{
    private readonly IMongoCollection<Customer> _customers;
    private readonly IMongoCollection<Subscription> _subscriptions;
    private readonly IMongoCollection<SyncRun> _syncRuns;

    public MongoRepository(IOptions<MongoOptions> mongoOptions)
    {
        var client = new MongoClient(mongoOptions.Value.ConnectionString);
        var database = client.GetDatabase(mongoOptions.Value.Database);
        _customers = database.GetCollection<Customer>("customers");
        _subscriptions = database.GetCollection<Subscription>("subscriptions");
        _syncRuns = database.GetCollection<SyncRun>("sync_runs");
        EnsureIndexes();
    }

    public async Task UpsertCustomersAsync(IReadOnlyCollection<Customer> customers, CancellationToken cancellationToken)
    {
        foreach (var customer in customers)
        {
            var filter = Builders<Customer>.Filter.Eq(x => x.ExternalId, customer.ExternalId);
            await _customers.ReplaceOneAsync(filter, customer, new ReplaceOptions { IsUpsert = true }, cancellationToken);
        }
    }

    public async Task UpsertSubscriptionsAsync(IReadOnlyCollection<Subscription> subscriptions, CancellationToken cancellationToken)
    {
        foreach (var subscription in subscriptions)
        {
            var filter = Builders<Subscription>.Filter.Eq(x => x.Id, subscription.Id);
            await _subscriptions.ReplaceOneAsync(filter, subscription, new ReplaceOptions { IsUpsert = true }, cancellationToken);
        }
    }

    public async Task<IReadOnlyCollection<ExpiredSubscriptionReportRow>> GetExpiredSubscriptionsAsync(int minDays, CancellationToken cancellationToken)
    {
        var threshold = DateTime.UtcNow.AddDays(-minDays);
        var filter = Builders<Subscription>.Filter.And(
            Builders<Subscription>.Filter.Lte(x => x.EndDate, threshold),
            Builders<Subscription>.Filter.Eq(x => x.Status, "expired"));

        var subscriptions = await _subscriptions.Find(filter).ToListAsync(cancellationToken);
        var customerIds = subscriptions.Select(x => x.CustomerId).Distinct().ToList();
        var customers = await _customers.Find(Builders<Customer>.Filter.In(x => x.ExternalId, customerIds)).ToListAsync(cancellationToken);
        var lookup = customers.ToDictionary(x => x.ExternalId, x => x);

        return subscriptions.Select(s =>
        {
            lookup.TryGetValue(s.CustomerId, out var customer);
            return new ExpiredSubscriptionReportRow(
                s.CustomerId,
                customer?.FullName ?? "Unknown",
                s.PlanCode,
                s.EndDate,
                (DateTime.UtcNow.Date - s.EndDate.Date).Days,
                customer?.District ?? "Unknown",
                s.Status);
        }).ToList();
    }

    public async Task<SyncRun?> GetLastSuccessfulSyncAsync(CancellationToken cancellationToken)
    {
        var filter = Builders<SyncRun>.Filter.Eq(x => x.Status, "success");
        return await _syncRuns.Find(filter).SortByDescending(x => x.FinishedAt).FirstOrDefaultAsync(cancellationToken);
    }

    public Task RecordSyncRunAsync(SyncRun run, CancellationToken cancellationToken)
        => _syncRuns.ReplaceOneAsync(
            Builders<SyncRun>.Filter.Eq(x => x.Id, run.Id),
            run,
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);

    private void EnsureIndexes()
    {
        _customers.Indexes.CreateMany(
        [
            new CreateIndexModel<Customer>(Builders<Customer>.IndexKeys.Ascending(x => x.ExternalId), new CreateIndexOptions { Unique = true }),
            new CreateIndexModel<Customer>(Builders<Customer>.IndexKeys.Ascending(x => x.UpdatedAt)),
            new CreateIndexModel<Customer>(Builders<Customer>.IndexKeys.Ascending(x => x.Status))
        ]);

        _subscriptions.Indexes.CreateMany(
        [
            new CreateIndexModel<Subscription>(Builders<Subscription>.IndexKeys.Ascending(x => x.CustomerId)),
            new CreateIndexModel<Subscription>(Builders<Subscription>.IndexKeys.Ascending(x => x.EndDate)),
            new CreateIndexModel<Subscription>(Builders<Subscription>.IndexKeys.Ascending(x => x.Status)),
            new CreateIndexModel<Subscription>(Builders<Subscription>.IndexKeys.Ascending(x => x.UpdatedAt))
        ]);

        _syncRuns.Indexes.CreateOne(new CreateIndexModel<SyncRun>(Builders<SyncRun>.IndexKeys.Descending(x => x.StartedAt)));
    }
}
