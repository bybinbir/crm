using System.Security.Cryptography;
using System.Text;
using CRM.Core.Interfaces;

namespace CRM.Infrastructure.Security;

public sealed class DpapiCredentialVault : ICredentialVault
{
    public Task<(string Username, string Password)> GetCredentialsAsync(string key, CancellationToken cancellationToken)
    {
        var userVar = Environment.GetEnvironmentVariable($"{key}_USER") ?? "demo.user";
        var encrypted = Environment.GetEnvironmentVariable($"{key}_PASS_DPAPI");

        if (string.IsNullOrWhiteSpace(encrypted))
        {
            return Task.FromResult((userVar, "demo-password"));
        }

        var bytes = Convert.FromBase64String(encrypted);
        var clear = ProtectedData.Unprotect(bytes, null, DataProtectionScope.CurrentUser);
        return Task.FromResult((userVar, Encoding.UTF8.GetString(clear)));
    }

    public static string ProtectForCurrentUser(string plainText)
    {
        var bytes = Encoding.UTF8.GetBytes(plainText);
        var cipher = ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser);
        return Convert.ToBase64String(cipher);
    }
}
