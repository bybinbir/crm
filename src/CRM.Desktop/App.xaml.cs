using System.Windows;
using System.IO;
using CRM.Core.Interfaces;
using CRM.Desktop.ViewModels;
using CRM.Infrastructure.Adapters;
using CRM.Infrastructure.Config;
using CRM.Infrastructure.Security;
using CRM.Infrastructure.Sync;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CRM.Desktop;

public partial class App : Application
{
    public static ServiceProvider Services { get; private set; } = default!;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .Build();

        var serviceCollection = new ServiceCollection();
        serviceCollection.AddLogging(builder => builder.AddConsole());
        serviceCollection.Configure<CollectorOptions>(config.GetSection("Collector"));
        serviceCollection.Configure<MongoOptions>(config.GetSection("Mongo"));

        serviceCollection.AddSingleton<ICredentialVault, DpapiCredentialVault>();
        serviceCollection.AddSingleton<ICRMAdapter, PlaywrightCrmAdapter>();
        serviceCollection.AddSingleton<ICRMRepository, MongoRepository>();
        serviceCollection.AddSingleton<SyncOrchestrator>();
        serviceCollection.AddSingleton<ExportService>();
        serviceCollection.AddSingleton<MainViewModel>();

        Services = serviceCollection.BuildServiceProvider();
    }
}
