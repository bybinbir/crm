import Link from "next/link";
import { aggregateByMonth, compareMonths, segmentByPackage } from "@/lib/analiz/segmentasyon";
import { computeLtv, summariseLtv } from "@/lib/analiz/ltv";
import { formatPercent, formatTRY } from "@/lib/analiz/ciro";
import { fetchInvoicesForAnalysis } from "@/lib/db/analiz-queries";

export const metadata = { title: "Karşılaştırma · crmanaliz" };
export const dynamic = "force-dynamic";

const TR_MONTH = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric",
});

function currentMonthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default async function KarsilastirPage(): Promise<React.ReactElement> {
  const since = new Date();
  since.setMonth(since.getMonth() - 13); // last 13 months for YoY
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  let invoices: Awaited<ReturnType<typeof fetchInvoicesForAnalysis>> = [];
  let dbError: string | null = null;
  try {
    invoices = await fetchInvoicesForAnalysis(since);
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const monthly = aggregateByMonth(invoices);
  const cmp = compareMonths(monthly, currentMonthKey());
  const segments = segmentByPackage(invoices);
  const ltv = summariseLtv(computeLtv(invoices));

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
          Karşılaştırma
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-fg-2)]">
          Mevcut ay vs önceki ay vs geçen yıl aynı ay; paket bazlı
          segmentasyon; müşteri başına yaşam değeri (LTV).
        </p>
      </header>

      {dbError ? (
        <div className="mb-8 rounded-[var(--radius-card)] border border-[color:var(--color-warning)]/30 bg-[color:var(--color-surface-1)] p-4 text-sm text-[color:var(--color-fg-1)]">
          Veritabanı sorgulanamadı: {dbError}
        </div>
      ) : null}

      {/* Ay-ay karşılaştırma */}
      <section className="mb-12">
        <h2 className="mb-4 text-base font-semibold tracking-[var(--tracking-tight)] text-[color:var(--color-fg-0)]">
          Bu Ay
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            label="Bu Ay"
            sub={cmp.current ? TR_MONTH.format(parseYM(cmp.current.ay)) : "—"}
            value={cmp.current ? formatTRY(cmp.current.kesilen) : "—"}
            hint={
              cmp.current
                ? `${cmp.current.faturaSayisi} fatura · ${cmp.current.benzersizMusteri} müşteri`
                : "veri yok"
            }
          />
          <Card
            label="Geçen Ay (MoM)"
            sub={cmp.previous ? TR_MONTH.format(parseYM(cmp.previous.ay)) : "—"}
            value={cmp.previous ? formatTRY(cmp.previous.kesilen) : "—"}
            hint={cmp.momKesilen === null ? "karşılaştırma yok" : `${withSign(cmp.momKesilen)}`}
            tone={
              cmp.momKesilen === null
                ? "neutral"
                : cmp.momKesilen >= 0
                  ? "positive"
                  : "negative"
            }
          />
          <Card
            label="Geçen Yıl Aynı Ay (YoY)"
            sub={cmp.yearAgo ? TR_MONTH.format(parseYM(cmp.yearAgo.ay)) : "—"}
            value={cmp.yearAgo ? formatTRY(cmp.yearAgo.kesilen) : "—"}
            hint={cmp.yoyKesilen === null ? "karşılaştırma yok" : `${withSign(cmp.yoyKesilen)}`}
            tone={
              cmp.yoyKesilen === null
                ? "neutral"
                : cmp.yoyKesilen >= 0
                  ? "positive"
                  : "negative"
            }
          />
        </div>
      </section>

      {/* Paket segmentasyonu */}
      <section className="mb-12">
        <h2 className="mb-4 text-base font-semibold tracking-[var(--tracking-tight)] text-[color:var(--color-fg-0)]">
          Paket Bazlı
        </h2>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)]">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-surface-2)] text-left text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
              <tr>
                <th className="px-4 py-3">Paket</th>
                <th className="px-4 py-3 text-right">Müşteri</th>
                <th className="px-4 py-3 text-right">Kesilen</th>
                <th className="px-4 py-3 text-right">Tahsil</th>
                <th className="px-4 py-3 text-right">Oran</th>
                <th className="px-4 py-3 text-right">Müşteri Başı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-border)]">
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[color:var(--color-fg-3)]">
                    Veri yok.
                  </td>
                </tr>
              ) : (
                segments.map((s) => (
                  <tr key={s.paketAdi}>
                    <td className="px-4 py-3 text-[color:var(--color-fg-0)]">{s.paketAdi}</td>
                    <td className="numeric px-4 py-3 text-right tabular-nums text-[color:var(--color-fg-1)]">
                      {s.musteriSayisi}
                    </td>
                    <td className="numeric px-4 py-3 text-right tabular-nums">{formatTRY(s.kesilen)}</td>
                    <td className="numeric px-4 py-3 text-right tabular-nums">{formatTRY(s.tahsilEdilen)}</td>
                    <td
                      className={[
                        "numeric px-4 py-3 text-right tabular-nums",
                        s.odemeOrani < 0.85
                          ? "text-[color:var(--color-warning)]"
                          : "text-[color:var(--color-fg-1)]",
                      ].join(" ")}
                    >
                      {formatPercent(s.odemeOrani, 1)}
                    </td>
                    <td className="numeric px-4 py-3 text-right tabular-nums">
                      {formatTRY(s.ortMusteri)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* LTV özet */}
      <section>
        <h2 className="mb-4 text-base font-semibold tracking-[var(--tracking-tight)] text-[color:var(--color-fg-0)]">
          Müşteri Yaşam Değeri (LTV)
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card label="Müşteri" value={String(ltv.count)} sub="toplam" />
          <Card label="Ortalama LTV" value={formatTRY(ltv.ortalama)} sub="aylık ort." />
          <Card label="Medyan LTV" value={formatTRY(ltv.medyan)} sub="aylık" />
          <Card label="Toplam Gelir" value={formatTRY(ltv.toplamGelir)} sub="13 ay" />
        </div>
      </section>
    </main>
  );
}

function parseYM(ym: string): Date {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1));
}

function withSign(rate: number): string {
  const s = formatPercent(rate, 1);
  return rate >= 0 ? `+${s}` : s;
}

type Tone = "neutral" | "positive" | "negative" | "warning";
const toneClass: Record<Tone, string> = {
  neutral: "text-[color:var(--color-fg-2)]",
  positive: "text-[color:var(--color-positive)]",
  negative: "text-[color:var(--color-negative)]",
  warning: "text-[color:var(--color-warning)]",
};

function Card({
  label,
  sub,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  sub?: string;
  value: string;
  hint?: string;
  tone?: Tone;
}): React.ReactElement {
  return (
    <article className="rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
        {label}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-[color:var(--color-fg-3)]">{sub}</p> : null}
      <p className="numeric mt-2 text-2xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)]">
        {value}
      </p>
      {hint ? (
        <p className={["mt-1 text-xs tabular-nums", toneClass[tone]].join(" ")}>{hint}</p>
      ) : null}
    </article>
  );
}
