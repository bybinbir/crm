using System.Security.Cryptography;
using System.Text;
using CRM.Core.Interfaces;
using CRM.Core.Models;
using CRM.Infrastructure.Config;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Playwright;

namespace CRM.Infrastructure.Adapters;

public sealed class PlaywrightCrmAdapter(
    IOptions<CollectorOptions> options,
    ICredentialVault credentialVault,
    ILogger<PlaywrightCrmAdapter> logger) : ICRMAdapter
{
    private readonly CollectorOptions _options = options.Value;

    public async Task LoginAsync(CancellationToken cancellationToken)
    {
        var creds = await credentialVault.GetCredentialsAsync("CRM", cancellationToken);
        using var playwright = await Playwright.CreateAsync();
        await using var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions { Headless = true });
        var page = await browser.NewPageAsync();

        await page.GotoAsync($"{_options.CrmBaseUrl}{_options.LoginPath}");
        await page.FillAsync(_options.Selectors.UsernameInput, creds.Username);
        await page.FillAsync(_options.Selectors.PasswordInput, creds.Password);
        await page.ClickAsync(_options.Selectors.LoginButton);
        logger.LogInformation("CRM login flow executed.");
    }

    public async Task<IReadOnlyCollection<Customer>> PullCustomersAsync(DateTime? changedAfter, CancellationToken cancellationToken)
    {
        await Task.Delay(150, cancellationToken); // placeholder for real selector-based scraping.
        var rows = new List<Customer>
        {
            new()
            {
                Id = Guid.NewGuid().ToString("N"),
                ExternalId = "C-1001",
                FullName = "Ayşe Demir",
                District = "Kadıköy",
                Neighborhood = "Fikirtepe",
                UpdatedAt = DateTime.UtcNow,
                Fingerprint = ComputeFingerprint("C-1001", "Ayşe Demir", "Kadıköy")
            }
        };

        return rows;
    }

    public async Task<IReadOnlyCollection<Subscription>> PullSubscriptionsAsync(DateTime? changedAfter, CancellationToken cancellationToken)
    {
        await Task.Delay(150, cancellationToken);
        return
        [
            new Subscription
            {
                Id = "S-9001",
                CustomerId = "C-1001",
                PlanCode = "FIBER-100",
                MonthlyPrice = 499,
                StartDate = DateTime.UtcNow.AddMonths(-14),
                EndDate = DateTime.UtcNow.AddDays(-75),
                Status = "expired",
                UpdatedAt = DateTime.UtcNow,
                Fingerprint = ComputeFingerprint("S-9001", "C-1001", "expired")
            }
        ];
    }

    private static string ComputeFingerprint(params string[] values)
    {
        var merged = string.Join('|', values);
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(merged));
        return Convert.ToHexString(hash);
    }
}
