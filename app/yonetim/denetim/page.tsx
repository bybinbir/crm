import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCapability, AuthError } from "@/lib/auth/guard";
import {
  listAuditEvents,
  parseAuditQuery,
  type AuditQueryResult,
} from "@/lib/db/audit-queries";
import { AuditFilterBar } from "./filter-bar";
import { AuditLogTable } from "@/components/yonetim/audit-log-table";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Denetim Günlüğü · crmanaliz",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DenetimPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<React.ReactElement> {
  // RBAC gate: only roles with view:audit-log (operator) get past this.
  try {
    await requireCapability("view:audit-log");
  } catch (e) {
    if (e instanceof AuthError && e.status === 401) {
      redirect("/giris?next=/yonetim/denetim");
    }
    throw e;
  }

  const sp = await searchParams;
  const opts = parseAuditQuery(sp);

  let result: AuditQueryResult | null = null;
  let dbError: string | null = null;
  try {
    result = await listAuditEvents(opts);
  } catch (e) {
    // Surface DB unavailability as an inline error rather than crashing
    // the page; admins should still see the filters and the empty state.
    dbError = e instanceof Error ? e.message : "Veritabanı erişilemedi.";
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <header className="mb-8 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-fg-3)]">
          binbirnet · yönetim
        </p>
        <h1 className="text-3xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)] md:text-4xl">
          Denetim Günlüğü
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-fg-2)]">
          Sistemde yapılan tüm yetki, oturum, dışa aktarma ve veri çekme
          eylemlerinin zaman damgalı kaydı.
        </p>
      </header>

      <AuditFilterBar params={opts} />

      {dbError ? (
        <div className="mt-6 rounded-[var(--radius-card)] border border-[color:var(--color-warning)]/30 bg-[color:var(--color-surface-1)] p-4 text-sm text-[color:var(--color-fg-1)]">
          Veritabanı şu an erişilemiyor. Migration tamam mı? ({dbError})
        </div>
      ) : null}

      {result ? <AuditLogTable result={result} /> : null}

      {result ? (
        <nav
          aria-label="Sayfalama"
          className="mt-6 flex items-center justify-between text-sm text-[color:var(--color-fg-2)]"
        >
          <span>
            Sayfa {result.page} · {result.rows.length} kayıt
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={makeHref(opts, { page: result.page - 1 })}
                className="rounded-md border border-[color:var(--color-border-1)] px-3 py-1 text-[color:var(--color-fg-1)] hover:bg-[color:var(--color-surface-2)]"
              >
                ‹ Önceki
              </Link>
            ) : null}
            {result.hasMore ? (
              <Link
                href={makeHref(opts, { page: result.page + 1 })}
                className="rounded-md border border-[color:var(--color-border-1)] px-3 py-1 text-[color:var(--color-fg-1)] hover:bg-[color:var(--color-surface-2)]"
              >
                Sonraki ›
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </main>
  );
}

function makeHref(
  opts: ReturnType<typeof parseAuditQuery>,
  override: { page: number }
): string {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from.toISOString().slice(0, 10));
  if (opts.to) params.set("to", opts.to.toISOString().slice(0, 10));
  if (opts.aksiyon) params.set("aksiyon", opts.aksiyon);
  if (opts.sonuc) params.set("sonuc", opts.sonuc);
  if (opts.kullaniciId) params.set("kullaniciId", opts.kullaniciId);
  params.set("page", String(override.page));
  params.set("pageSize", String(opts.pageSize));
  return `/yonetim/denetim?${params.toString()}`;
}
