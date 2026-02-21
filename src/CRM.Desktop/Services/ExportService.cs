using System.Globalization;
using CRM.Core.Models;
using CsvHelper;

namespace CRM.Desktop.Services;

public sealed class ExportService
{
    public async Task ExportExpiredSubscriptionsCsvAsync(string path, IEnumerable<ExpiredSubscriptionReportRow> rows)
    {
        await using var stream = File.Create(path);
        await using var writer = new StreamWriter(stream);
        await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        await csv.WriteRecordsAsync(rows);
    }
}
