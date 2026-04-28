import Link from "next/link";

export function QuickLink({
  href,
  title,
  sub,
}: {
  href: string;
  title: string;
  sub: string;
}): React.ReactElement {
  return (
    <li>
      <Link
        href={href}
        className={[
          "flex items-baseline justify-between rounded-[var(--radius-card)]",
          "border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]",
          "px-4 py-3",
          "hover:bg-[color:var(--color-surface-3)] transition-colors",
        ].join(" ")}
      >
        <span className="flex flex-col">
          <span className="text-sm font-medium text-[color:var(--color-fg-0)]">
            {title}
          </span>
          <span className="text-xs text-[color:var(--color-fg-3)]">{sub}</span>
        </span>
        <span aria-hidden className="text-[color:var(--color-fg-3)]">
          →
        </span>
      </Link>
    </li>
  );
}
