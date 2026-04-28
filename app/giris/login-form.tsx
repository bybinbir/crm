"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string }): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData): void {
    setError(null);
    start(async () => {
      const res = await loginAction(formData);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
          E-posta
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          autoFocus
          className="rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
          Parola
        </span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-card)] border border-[color:var(--color-negative)]/30 bg-[color:var(--color-surface-1)] px-3 py-2 text-sm text-[color:var(--color-negative)]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-[var(--radius-card)] bg-[color:var(--color-accent)] px-5 py-3 text-sm font-medium tracking-tight text-[color:var(--color-accent-fg)] transition-colors hover:bg-[color:var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
