/**
 * 30 gün ödememiş müşteri listesi — churn-risk havuzu.
 *
 * Server Component: DB sorgusu, decryption ve render aynı request scope'unda
 * yapılır. Sonuç tarayıcıya HTML olarak gider (raw blob asla).
 */
import Link from "next/link";
import {
  listUnpaidCustomers,
  aggregateByIlce,
  bucketByAge,
} from "@/lib/analiz/churn";
import { formatTRY } from "@/lib/analiz/ciro";

export const metadata = { title: "Ödenmemiş Müşteriler · crmanaliz" };
export const dynamic = "force-dynamic";

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function OdenmemisPage(): Promise<React.ReactElement> {
  let rows: Awaited<ReturnType<typeof listUnpaidCustomers>> = [];
  let dbError: string | null = null;
  try {
    rows = await listUnpaidCustomers(30, { decrypt: true });
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const byIlce = aggregateByIlce(rows);
  const ageBuckets = bucketByAge(rows);
  const totalBorc = rows.reduce((acc, r) => acc + r.borc, 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <header className="mb-8 flex flex-col gap-1">
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-fg-3)] hover:text-[color:var(--color-fg-1)]"
        >
          ← Genel Duruma dön
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)] md:text-4xl">
          Ödenmemiş Müşteriler
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-fg-2)]">
          Son 30 gün içinde ödenmemiş faturası olan veya 30 günden uzun
          süredir hareketi görülmeyen aboneler. KVKK kapsamında bu sayfa
          server-side decrypt edilir; ham PII tarayıcıya gitmez.
        </p>
      </header>

      {dbError ? (
        <div className="mb-8 rounded-[var(--radius-card)] border border-[color:var(--color-warning)]/30 bg-[color:var(--color-surface-1)] p-4 text-sm text-[color:var(--color-fg-1)]">
          Veritabanı sorgulanamadı: {dbError}. Önce migration ve daily pull
          çalıştırılmış olmalı.
        </div>
      ) : null}

      {/* Üst özet */}
      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Risk Havuzu" value={String(rows.length)} sub="müşteri" />
        <SummaryCard label="Toplam Borç" value={formatTRY(totalBorc)} sub="açık tutar" />
        <SummaryCard
          label="En Yaşlı Borç"
          value={
            ageBuckets.find((b) => b.label === "90+ gün")?.count.toString() ??
            "0"
          }
          sub="90+ gün"
        />
      </section>

      {/* İlçe / yaşlandırma kompozit */}
      <section className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="İlçe Bazlı Dağılım" subtitle="borç ağırlıklı sıralı">
          <ul className="divide-y divide-[color:var(--color-border)]">
            {byIlce.length === 0 ? (
              <li className="py-3 text-sm text-[color:var(--color-fg-3)]">
                Yeterli veri yok.
              </li>
            ) : (
              byIlce.slice(0, 8).map((b) => (
                <li
                  key={b.ilce}
                  className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 py-3"
                >
                  <span className="text-sm text-[color:var(--color-fg-1)]">
                    {b.ilce}
                  </span>
                  <span className="numeric text-xs text-[color:var(--color-fg-3)]">
                    {b.musteriSayisi} müşteri
                  </span>
                  <span className="numeric text-sm font-medium tabular-nums text-[color:var(--color-fg-0)]">
                    {formatTRY(b.borc)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel title="Yaşlandırma" subtitle="son fatura tarihinden">
          <ul className="divide-y divide-[color:var(--color-border)]">
            {ageBuckets.map((b) => (
              <li
                key={b.label}
                className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3"
              >
                <span className="text-sm text-[color:var(--color-fg-1)]">
                  {b.label}
                </span>
                <span className="numeric text-sm font-medium tabular-nums text-[color:var(--color-fg-0)]">
                  {b.count}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* Müşteri listesi */}
      <section>
        <h2 className="mb-4 text-base font-semibold tracking-[var(--tracking-tight)] text-[color:var(--color-fg-0)]">
          Müşteri Listesi
          <span className="ml-2 text-xs font-normal uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
            ilk {Math.min(rows.length, 200)} kayıt
          </span>
        </h2>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)]">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-surface-2)] text-left text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
              <tr>
                <th className="px-4 py-3">Abone No</th>
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">İlçe / Mahalle</th>
                <th className="px-4 py-3">Paket</th>
                <th className="px-4 py-3 text-right">Son Hareket</th>
                <th className="px-4 py-3 text-right">Borç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-border)]">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[color:var(--color-fg-3)]"
                  >
                    Risk havuzu boş. (Veya henüz pull-day çalışmadı.)
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.aboneNo}>
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--color-fg-2)]">
                      {r.aboneNo}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--color-fg-0)]">
                      {r.unvan ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--color-fg-1)]">
                      {r.ilce ?? "—"}
                      {r.mahalle ? (
                        <span className="text-[color:var(--color-fg-3)]"> · {r.mahalle}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--color-fg-1)]">
                      {r.paketAdi ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[color:var(--color-fg-2)]">
                      {r.sonAktiflikTarihi
                        ? TR_DATE.format(r.sonAktiflikTarihi)
                        : "—"}
                    </td>
                    <td className="numeric px-4 py-3 text-right font-medium tabular-nums text-[color:var(--color-fg-0)]">
                      {formatTRY(r.borc)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}): React.ReactElement {
  return (
    <article className="rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] px-6 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
        {label}
      </p>
      <p className="numeric mt-2 text-3xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[color:var(--color-fg-3)]">{sub}</p>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <article className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] p-6">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-[var(--tracking-tight)] text-[color:var(--color-fg-0)]">
          {title}
        </h3>
        <span className="text-xs uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
          {subtitle}
        </span>
      </header>
      {children}
    </article>
  );
}
