namespace CRM.Infrastructure.Config;

public sealed class CollectorOptions
{
    public string CrmBaseUrl { get; set; } = "https://crm.example.local";
    public string LoginPath { get; set; } = "/login";
    public string CustomersPath { get; set; } = "/customers";
    public string SubscriptionsPath { get; set; } = "/subscriptions";
    public int PageSize { get; set; } = 100;
    public SelectorOptions Selectors { get; set; } = new();
}

public sealed class SelectorOptions
{
    public string UsernameInput { get; set; } = "#username";
    public string PasswordInput { get; set; } = "#password";
    public string LoginButton { get; set; } = "button[type='submit']";
    public string CustomerRows { get; set; } = "table#customers tbody tr";
}

public sealed class MongoOptions
{
    public string ConnectionString { get; set; } = "mongodb://localhost:27017";
    public string Database { get; set; } = "isp_crm";
}
