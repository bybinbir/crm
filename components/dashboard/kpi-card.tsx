/**
 * KPI card — the dashboard's primary visual unit. Premium typography +
 * tabular numerals. Pass nothing for `value` to render a loading skeleton.
 */
import * as React from "react";

export type KpiTone = "neutral" | "positive" | "warning" | "negative";

export type KpiCardProps = {
  label: string;
  value: string | null | undefined;
  unit?: string;
  hint?: string;
  delta?: string;
  tone?: KpiTone;
  loading?: boolean;
};

const toneClass: Record<KpiTone, string> = {
  neutral: "text-[color:var(--color-fg-2)]",
  positive: "text-[color:var(--color-positive)]",
  warning: "text-[color:var(--color-warning)]",
  negative: "text-[color:var(--color-negative)]",
};

export function KpiCard(props: KpiCardProps): React.ReactElement {
  const tone = props.tone ?? "neutral";
  return (
    <article
      className={[
        "group flex flex-col justify-between",
        "rounded-[var(--radius-card)]",
        "border border-[color:var(--color-border)]",
        "bg-[color:var(--color-surface-1)]",
        "px-6 pt-5 pb-6 min-h-[160px]",
        "transition-colors hover:bg-[color:var(--color-surface-2)]",
      ].join(" ")}
    >
      <header className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-fg-3)]">
          {props.label}
        </span>
        {props.delta ? (
          <span className={["text-xs font-medium tabular-nums", toneClass[tone]].join(" ")}>
            {props.delta}
          </span>
        ) : null}
      </header>

      <div className="mt-6 flex items-baseline gap-1.5">
        {props.loading ? (
          <span
            aria-hidden
            className="numeric block h-9 w-24 animate-pulse rounded-md bg-[color:var(--color-surface-3)]"
          />
        ) : (
          <>
            <span className="numeric text-4xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)]">
              {props.value ?? "—"}
            </span>
            {props.unit ? (
              <span className="text-base font-medium text-[color:var(--color-fg-2)]">
                {props.unit}
              </span>
            ) : null}
          </>
        )}
      </div>

      {props.hint ? (
        <p className="mt-3 text-xs leading-relaxed text-[color:var(--color-fg-3)]">
          {props.hint}
        </p>
      ) : null}
    </article>
  );
}
