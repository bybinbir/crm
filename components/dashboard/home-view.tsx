import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { QuickLink } from "@/components/dashboard/quick-link";
import type { DashboardSnapshot } from "@/lib/dashboard-snapshot";
import { formatPercent, formatTRY, summarise } from "@/lib/analiz/ciro";

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const NUM = new Intl.NumberFormat("tr-TR");

export function HomeView({
  snap,
}: {
  snap: DashboardSnapshot;
}): React.ReactElement {
  const today = TR_DATE.format(new Date());
  const summary = summarise(snap.daily);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <header className="mb-12 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-fg-3)]">
          binbirnet · komuta merkezi
        </p>
        <h1 className="text-3xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)] md:text-4xl">
          Genel Durum
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-fg-2)]">{today}</p>
      </header>

      {snap.error ? (
        <div className="mb-10 rounded-[var(--radius-card)] border border-[color:var(--color-warning)]/30 bg-[color:var(--color-surface-1)] p-4 text-sm text-[color:var(--color-fg-1)]">
          Veritabanı hazır değil. Önce <code>pnpm db:migrate</code> ve{" "}
          <code>pnpm pull:day</code> çalıştırın. ({snap.error})
        </div>
      ) : null}

      <section
        aria-label="Anahtar göstergeler"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="Aktif Müşteri"
          value={snap.customers === null ? "—" : NUM.format(snap.customers)}
          hint="senkronize edilen abone sayısı"
        />
        <KpiCard
          label="Aylık Tahsilat"
          value={snap.rate === null ? "—" : formatTRY(snap.rate.paid).replace(" ₺", "")}
          {...(snap.rate === null ? {} : { unit: "₺" })}
          hint="son 30 gün ödenen toplam"
        />
        <KpiCard
          label="Ödeme Oranı"
          value={snap.rate === null ? "—" : formatPercent(snap.rate.rate, 1).replace("%", "")}
          {...(snap.rate === null ? {} : { unit: "%" })}
          hint="ödenen / kesilen tutar (30 gün)"
          tone={snap.rate && snap.rate.rate < 0.85 ? "warning" : "neutral"}
        />
        <KpiCard
          label="Risk Havuzu"
          value={snap.unpaid === null ? "—" : String(snap.unpaid)}
          {...(snap.unpaid === null ? {} : { unit: "müşteri" })}
          hint="30 gün ödememiş veya hareketi yok"
          tone={(snap.unpaid ?? 0) > 50 ? "warning" : "neutral"}
        />
      </section>

      <section
        aria-label="Detay"
        className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <article className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] p-6">
          <header className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-[var(--tracking-tight)] text-[color:var(--color-fg-0)]">
              Günlük Ciro
            </h2>
            <span className="text-xs uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
              son 30 gün
            </span>
          </header>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="numeric text-2xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)]">
              {formatTRY(summary.totalPaid)}
            </span>
            {summary.weekOverWeek !== null ? (
              <span
                className={[
                  "text-xs font-medium tabular-nums",
                  summary.weekOverWeek >= 0
                    ? "text-[color:var(--color-positive)]"
                    : "text-[color:var(--color-negative)]",
                ].join(" ")}
              >
                {summary.weekOverWeek >= 0 ? "+" : ""}
                {formatPercent(summary.weekOverWeek, 1)} h/h
              </span>
            ) : null}
          </div>
          <div className="mt-6">
            <RevenueChart points={snap.daily} />
          </div>
        </article>

        <article className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] p-6">
          <h2 className="text-base font-semibold tracking-[var(--tracking-tight)] text-[color:var(--color-fg-0)]">
            Hızlı Erişim
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            <QuickLink
              href="/musteriler"
              title="Müşteri Arama"
              sub="ISS Manager üzerinde isim/telefon"
            />
            <QuickLink
              href="/odenmemis"
              title="Ödenmemiş Müşteriler"
              sub="Risk havuzu, ilçe bazlı dağılım"
            />
          </ul>
        </article>
      </section>

      <footer className="mt-16 border-t border-[color:var(--color-border)] pt-6 text-xs text-[color:var(--color-fg-3)]">
        crmanaliz · KVKK kapsamında — tüm PII şifreli saklanır.
      </footer>
    </main>
  );
}
