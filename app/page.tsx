/**
 * Dashboard — entry surface.
 *
 * M1 milestone: shell only. Real KPI values arrive in M2 once the daily
 * invoice pull job is wired up. The card layout, typography, and spacing
 * are the deliverable here — visual rhythm should already feel premium
 * even with placeholder data.
 */
import { KpiCard } from "@/components/dashboard/kpi-card";

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function HomePage(): React.ReactElement {
  const today = TR_DATE.format(new Date());

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10 md:py-16">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="mb-12 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-fg-3)]">
          binbirnet · komuta merkezi
        </p>
        <h1 className="text-3xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)] md:text-4xl">
          Genel Durum
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-fg-2)]">
          {today}
        </p>
      </header>

      {/* ── KPI grid ────────────────────────────────────────────────────── */}
      <section
        aria-label="Anahtar göstergeler"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="Aktif Müşteri"
          value="—"
          hint="ISS Manager senkronu bekliyor"
        />
        <KpiCard
          label="Aylık Ciro"
          value="—"
          unit="₺"
          hint="Son 30 günlük tahsilat"
        />
        <KpiCard
          label="Ödeme Oranı"
          value="—"
          unit="%"
          hint="Bu ayki ödenmiş / toplam"
        />
        <KpiCard
          label="Paket Dağılımı"
          value="—"
          hint="En yaygın paket payı"
        />
      </section>

      {/* ── Detay alanları (M2'de doldurulacak) ─────────────────────────── */}
      <section
        aria-label="Detay alanları"
        className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <Panel title="Günlük Ciro" subtitle="son 30 gün" />
        <Panel title="Mahalle Bazlı Yoğunluk" subtitle="Anamur ilçesi" />
      </section>

      <footer className="mt-16 border-t border-[color:var(--color-border)] pt-6 text-xs text-[color:var(--color-fg-3)]">
        crmanaliz · M1 yetenek kanıtı · KVKK kapsamında — tüm PII şifreli
        saklanır.
      </footer>
    </main>
  );
}

function Panel({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}): React.ReactElement {
  return (
    <article className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] p-6">
      <header className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-[var(--tracking-tight)] text-[color:var(--color-fg-0)]">
          {title}
        </h2>
        <span className="text-xs uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
          {subtitle}
        </span>
      </header>
      <div className="mt-6 flex h-44 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[color:var(--color-border-strong)] text-sm text-[color:var(--color-fg-3)]">
        M2&apos;de doldurulacak
      </div>
    </article>
  );
}
