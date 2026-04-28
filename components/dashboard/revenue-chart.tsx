/**
 * Daily revenue chart — pure SVG, no client JS, no chart library.
 *
 * Why hand-rolled SVG:
 *   - Renders inside a Server Component (no hydration cost).
 *   - Chart libraries (recharts, chart.js) would add ~50-150KB; for a
 *     single-curve dashboard chart it's overkill.
 *   - Fully themeable via the existing CSS variables.
 *
 * Design:
 *   - Two stacked series — `invoiced` (light wash) and `paid` (accent
 *     stroke + filled area). The visual story: how much rolled in vs how
 *     much was actually collected.
 *   - 30-day window expected, but the component handles any length.
 *   - Empty / loading state is rendered by the parent; this component
 *     assumes at least one point.
 */
import type { DailyRevenuePoint } from "@/lib/db/repositories";
import { formatTRY } from "@/lib/analiz/ciro";

export type RevenueChartProps = {
  points: DailyRevenuePoint[];
  /** Visual height in px — viewBox is normalised. Default 200. */
  height?: number;
};

const W = 800;
const H = 200;
const PADDING_X = 24;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

export function RevenueChart({
  points,
  height = H,
}: RevenueChartProps): React.ReactElement {
  if (points.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-[color:var(--color-fg-3)]">
        Henüz veri yok — ilk pull-day çalışınca dolar.
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.invoiced), 1);
  const innerW = W - PADDING_X * 2;
  const innerH = H - PADDING_TOP - PADDING_BOTTOM;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;

  const x = (i: number): number => PADDING_X + i * stepX;
  const y = (v: number): number =>
    PADDING_TOP + (innerH - (v / max) * innerH);

  const paidPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p.paid).toFixed(2)}`)
    .join(" ");
  const invoicedPath = points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p.invoiced).toFixed(2)}`
    )
    .join(" ");

  // Filled area under `paid`.
  const paidArea =
    paidPath +
    ` L ${x(points.length - 1).toFixed(2)} ${(PADDING_TOP + innerH).toFixed(2)}` +
    ` L ${x(0).toFixed(2)} ${(PADDING_TOP + innerH).toFixed(2)} Z`;

  // Tick labels — first, middle, last.
  const tickIdx = Array.from(
    new Set([0, Math.floor(points.length / 2), points.length - 1])
  ).filter((i) => i >= 0 && i < points.length);

  return (
    <svg
      role="img"
      aria-label="Günlük ciro grafiği"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className="block"
    >
      <defs>
        <linearGradient id="paidFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Axis baseline */}
      <line
        x1={PADDING_X}
        x2={W - PADDING_X}
        y1={PADDING_TOP + innerH}
        y2={PADDING_TOP + innerH}
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      {/* Invoiced — light reference line */}
      <path
        d={invoicedPath}
        fill="none"
        stroke="var(--color-fg-3)"
        strokeWidth={1}
        strokeDasharray="3 4"
        opacity={0.6}
      />

      {/* Paid — main accented curve */}
      <path d={paidArea} fill="url(#paidFill)" />
      <path
        d={paidPath}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Endpoint marker */}
      {(() => {
        const last = points[points.length - 1];
        if (!last) return null;
        const lx = x(points.length - 1);
        const ly = y(last.paid);
        return (
          <g>
            <circle
              cx={lx}
              cy={ly}
              r={3.5}
              fill="var(--color-accent)"
              stroke="var(--color-surface-1)"
              strokeWidth={1.5}
            />
            <text
              x={lx - 6}
              y={ly - 8}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-fg-1)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatTRY(last.paid)}
            </text>
          </g>
        );
      })()}

      {/* X tick labels */}
      {tickIdx.map((i) => {
        const p = points[i];
        if (!p) return null;
        return (
          <text
            key={p.date}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill="var(--color-fg-3)"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {p.date.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}
