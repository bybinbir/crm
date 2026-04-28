import type { AuditQueryResult } from "@/lib/db/audit-queries";

const TR_DATETIME = new Intl.DateTimeFormat("tr-TR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * Audit log table — sade, satır başına bir olay. PII yok, secret yok.
 *   - kullaniciId opaque bir id (rakam veya UUID); isim/email burada gösterilmez.
 *   - ip ve requestId teknik debug için, müşteri verisi değil.
 */
export function AuditLogTable({ result }: { result: AuditQueryResult }): React.ReactElement {
  if (result.rows.length === 0) {
    return (
      <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-[color:var(--color-border-1)] bg-[color:var(--color-surface-1)] p-10 text-center text-sm text-[color:var(--color-fg-2)]">
        Bu filtreyle eşleşen denetim kaydı yok.
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-border-1)] bg-[color:var(--color-surface-1)]">
      <table className="w-full text-left text-sm text-[color:var(--color-fg-0)]">
        <thead className="bg-[color:var(--color-surface-2)] text-xs uppercase tracking-wide text-[color:var(--color-fg-2)]">
          <tr>
            <th scope="col" className="px-4 py-2.5">Zaman</th>
            <th scope="col" className="px-4 py-2.5">Kullanıcı</th>
            <th scope="col" className="px-4 py-2.5">Aksiyon</th>
            <th scope="col" className="px-4 py-2.5">Kaynak</th>
            <th scope="col" className="px-4 py-2.5">Sonuç</th>
            <th scope="col" className="px-4 py-2.5">İstek / IP</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r) => (
            <tr
              key={r.id.toString()}
              className="border-t border-[color:var(--color-border-1)]/60"
            >
              <td className="whitespace-nowrap px-4 py-2.5 text-[color:var(--color-fg-1)]">
                {TR_DATETIME.format(r.ts)}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--color-fg-1)]">
                {r.kullaniciId ?? "—"}
              </td>
              <td className="px-4 py-2.5 font-medium">{r.aksiyon}</td>
              <td className="px-4 py-2.5 text-[color:var(--color-fg-1)]">{r.kaynak}</td>
              <td className="px-4 py-2.5">
                <span
                  className={
                    r.sonuc === "ok"
                      ? "rounded-md bg-[color:var(--color-success)]/15 px-2 py-0.5 text-xs font-medium text-[color:var(--color-success)]"
                      : "rounded-md bg-[color:var(--color-warning)]/15 px-2 py-0.5 text-xs font-medium text-[color:var(--color-warning)]"
                  }
                >
                  {r.sonuc}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--color-fg-2)]">
                {r.requestId ? <span title={r.requestId}>{r.requestId.slice(0, 8)}…</span> : null}
                {r.ip ? <span className="ml-2">{r.ip}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
