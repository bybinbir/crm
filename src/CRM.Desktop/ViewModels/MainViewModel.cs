using System.Collections.ObjectModel;
using System.Globalization;
using CRM.Core.Interfaces;
using CRM.Core.Models;
using CRM.Desktop.Services;
using CRM.Infrastructure.Sync;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace CRM.Desktop.ViewModels;

public partial class MainViewModel(
    SyncOrchestrator syncOrchestrator,
    ICRMRepository crmRepository,
    ExportService exportService) : ObservableObject
{
    public ObservableCollection<ExpiredSubscriptionReportRow> ExpiredRows { get; } = [];

    [ObservableProperty]
    private string _statusText = "Hazır";

    [RelayCommand]
    private async Task RunSync()
    {
        StatusText = "Senkronizasyon çalışıyor...";
        await syncOrchestrator.RunIncrementalAsync(CancellationToken.None);
        StatusText = "Senkronizasyon tamamlandı.";
    }

    [RelayCommand]
    private async Task LoadExpiredReport()
    {
        ExpiredRows.Clear();
        var rows = await crmRepository.GetExpiredSubscriptionsAsync(60, CancellationToken.None);
        foreach (var row in rows)
        {
            ExpiredRows.Add(row);
        }

        StatusText = string.Format(CultureInfo.InvariantCulture, "{0} kayıt yüklendi.", rows.Count);
    }

    [RelayCommand]
    private async Task ExportCsv()
    {
        var file = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), $"expired_60_report_{DateTime.Now:yyyyMMdd_HHmm}.csv");
        await exportService.ExportExpiredSubscriptionsCsvAsync(file, ExpiredRows);
        StatusText = $"CSV üretildi: {file}";
    }
}
