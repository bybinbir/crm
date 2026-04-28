import type { AuditQueryOptions } from "@/lib/db/audit-queries";

/**
 * Filter bar — server component, plain HTML <form method="get">.
 * No client JS needed; the page re-renders with new search params.
 */
export function AuditFilterBar({ params }: { params: AuditQueryOptions }): React.ReactElement {
  const fromStr = params.from ? params.from.toISOString().slice(0, 10) : "";
  const toStr = params.to ? params.to.toISOString().slice(0, 10) : "";

  return (
    <form
      method="get"
      action="/yonetim/denetim"
      className="grid grid-cols-1 gap-3 rounded-[var(--radius-card)] border border-[color:var(--color-border-1)] bg-[color:var(--color-surface-1)] p-4 sm:grid-cols-2 md:grid-cols-6"
    >
      <label className="flex flex-col text-xs text-[color:var(--color-fg-2)]">
        Başlangıç
        <input
          type="date"
          name="from"
          defaultValue={fromStr}
          className="mt-1 rounded-md border border-[color:var(--color-border-1)] bg-[color:var(--color-surface-0)] px-2 py-1.5 text-sm text-[color:var(--color-fg-0)]"
        />
      </label>
      <label className="flex flex-col text-xs text-[color:var(--color-fg-2)]">
        Bitiş
        <input
          type="date"
          name="to"
          defaultValue={toStr}
          className="mt-1 rounded-md border border-[color:var(--color-border-1)] bg-[color:var(--color-surface-0)] px-2 py-1.5 text-sm text-[color:var(--color-fg-0)]"
        />
      </label>
      <label className="flex flex-col text-xs text-[color:var(--color-fg-2)]">
        Aksiyon
        <input
          type="text"
          name="aksiyon"
          defaultValue={params.aksiyon ?? ""}
          placeholder="örn. login.success"
          maxLength={100}
          className="mt-1 rounded-md border border-[color:var(--color-border-1)] bg-[color:var(--color-surface-0)] px-2 py-1.5 text-sm text-[color:var(--color-fg-0)]"
        />
      </label>
      <label className="flex flex-col text-xs text-[color:var(--color-fg-2)]">
        Sonuç
        <select
          name="sonuc"
          defaultValue={params.sonuc ?? ""}
          className="mt-1 rounded-md border border-[color:var(--color-border-1)] bg-[color:var(--color-surface-0)] px-2 py-1.5 text-sm text-[color:var(--color-fg-0)]"
        >
          <option value="">Hepsi</option>
          <option value="ok">ok</option>
          <option value="fail">fail</option>
        </select>
      </label>
      <label className="flex flex-col text-xs text-[color:var(--color-fg-2)]">
        Kullanıcı ID
        <input
          type="text"
          name="kullaniciId"
          defaultValue={params.kullaniciId ?? ""}
          maxLength={100}
          className="mt-1 rounded-md border border-[color:var(--color-border-1)] bg-[color:var(--color-surface-0)] px-2 py-1.5 text-sm text-[color:var(--color-fg-0)]"
        />
      </label>
      <div className="flex items-end gap-2">
        <input type="hidden" name="page" value="1" />
        <input type="hidden" name="pageSize" value={params.pageSize} />
        <button
          type="submit"
          className="rounded-md bg-[color:var(--color-fg-0)] px-4 py-1.5 text-sm font-medium text-[color:var(--color-bg-0)] hover:opacity-90"
        >
          Filtrele
        </button>
        <a
          href="/yonetim/denetim"
          className="rounded-md border border-[color:var(--color-border-1)] px-3 py-1.5 text-sm text-[color:var(--color-fg-1)] hover:bg-[color:var(--color-surface-2)]"
        >
          Temizle
        </a>
      </div>
    </form>
  );
}
