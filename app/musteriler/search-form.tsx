"use client";

/**
 * Client-side search form. Calls the server action and renders results.
 * Uses React's `useTransition` for a clean pending state without
 * client-side caching (we want fresh data on every search).
 */
import { useState, useTransition } from "react";
import { searchCustomers, type SearchResult } from "./actions";

const initial: SearchResult | null = null;

export function SearchForm(): React.ReactElement {
  const [result, setResult] = useState<SearchResult | null>(initial);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData): void {
    start(async () => {
      const res = await searchCustomers(formData);
      setResult(res);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={onSubmit} className="flex items-stretch gap-3">
        <input
          name="query"
          type="search"
          required
          minLength={3}
          placeholder="İsim, soyisim, telefon veya e-posta ara…"
          className={[
            "flex-1 rounded-[var(--radius-card)]",
            "border border-[color:var(--color-border)]",
            "bg-[color:var(--color-surface-1)]",
            "px-4 py-3 text-base",
            "placeholder:text-[color:var(--color-fg-3)]",
            "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)] focus:border-transparent",
            "transition-shadow",
          ].join(" ")}
          autoComplete="off"
          autoFocus
        />
        <button
          type="submit"
          disabled={pending}
          className={[
            "rounded-[var(--radius-card)] px-5 py-3",
            "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]",
            "text-sm font-medium tracking-tight",
            "hover:bg-[color:var(--color-accent-hover)]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "transition-colors",
          ].join(" ")}
        >
          {pending ? "Aranıyor…" : "Ara"}
        </button>
      </form>

      <ResultsView result={result} pending={pending} />
    </div>
  );
}

function ResultsView({
  result,
  pending,
}: {
  result: SearchResult | null;
  pending: boolean;
}): React.ReactElement {
  if (pending && !result) {
    return (
      <p className="text-sm text-[color:var(--color-fg-3)]">
        ISS Manager sorgulanıyor…
      </p>
    );
  }
  if (!result) {
    return (
      <p className="text-sm text-[color:var(--color-fg-3)]">
        En az 3 karakter girin. Sonuçlar KVKK gereği maskeli görünür.
      </p>
    );
  }
  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-[var(--radius-card)] border border-[color:var(--color-negative)]/30 bg-[color:var(--color-surface-1)] p-4"
      >
        <p className="text-sm font-medium text-[color:var(--color-negative)]">
          {result.error}
        </p>
        <p className="mt-1 text-xs text-[color:var(--color-fg-3)]">
          ({result.kind})
        </p>
      </div>
    );
  }

  if (result.customers.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-fg-2)]">
        “{result.query}” için sonuç bulunamadı.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
        {result.total} sonuç · sayfa {result.page + 1}/{result.totalPages}
      </p>
      <ul className="divide-y divide-[color:var(--color-border)] overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)]">
        {result.customers.map((c, idx) => (
          <li
            key={`${c.isim ?? ""}-${c.telefon_1 ?? ""}-${idx}`}
            className="grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[color:var(--color-fg-0)]">
                {c.isim ?? "—"} {c.soyisim ?? ""}
                {c.firma_unvan ? (
                  <span className="ml-2 text-[color:var(--color-fg-3)]">
                    · {c.firma_unvan}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-[color:var(--color-fg-3)]">
                {c.email ?? "—"}
              </p>
            </div>
            <p className="numeric text-sm tabular-nums text-[color:var(--color-fg-2)]">
              {c.telefon_1 ?? "—"}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-[color:var(--color-fg-3)]">
        ISS Manager tarafında KVKK maskeleme aktif. İsim, telefon ve
        e-posta sadece kısmen görünür.
      </p>
    </div>
  );
}
