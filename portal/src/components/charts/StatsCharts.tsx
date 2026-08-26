'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * /statistika grafiklari.
 *
 * Rang qoidalari (validator bilan tekshirilgan, oq fon ustida):
 *  - Bitta qatorli (single-series) magnitude grafiklar → BITTA rang (chinni).
 *    Nominal toifalarga qiymat-rampasi berilmaydi: bu uzunlikni ikki marta
 *    kodlagan bo'lardi.
 *  - Ta'lim darajasi tartiblangan shkala → bitta rangning ordinal rampasi
 *    (to'qdan ochiqqa: Oliy → Talab etilmaydi).
 */

const ACCENT = '#1391A5'; // chinni
const INK = '#10233A'; // siyoh
const MUTED = '#66707D'; // tosh
const GRID = '#E2DED5'; // chiziq — qattiq (dashed emas) nozik chiziq
const SURFACE = '#FFFFFF';

/** Ordinal ramp — validator: monotone L, ΔL ≥ 0.06, light-end 2.10:1, hue spread 2°. */
export const EDUCATION_RAMP = ['#094F5B', '#1391A5', '#6FBFCE'];

const nf = new Intl.NumberFormat('ru-RU');
const fmt = (n: number) => nf.format(Math.round(n)).replace(/ /g, ' ');

const axisTick = { fill: MUTED, fontSize: 13 };

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string }[];
  label?: string | number;
  suffix: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E2DED5] bg-white px-3 py-2 shadow-sm">
      <p className="text-[13px] text-[#10233A]">{label}</p>
      <p className="text-[13px] text-[#66707D]">
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(Number(payload[0].value ?? 0))}</span> {suffix}
      </p>
    </div>
  );
}

/** Grafik ostidagi jadval — ranggagina tayanmaslik uchun (a11y). */
function DataTable({
  rows,
  head,
  caption,
}: {
  rows: [string, string][];
  head: [string, string];
  caption: string;
}) {
  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer text-xs text-tosh transition-colors hover:text-chinni">
        {caption}
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-chiziq text-left text-tosh">
              <th scope="col" className="py-1.5 pr-4 font-500">{head[0]}</th>
              <th scope="col" className="py-1.5 text-right font-500">{head[1]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-chiziq/60 last:border-0">
                <td className="py-1.5 pr-4">{k}</td>
                <td className="raqam py-1.5 text-right">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Gorizontal bar — uzun nomli toifalar uchun (tumanlar, kasblar). */
export function HorizontalBars({
  data,
  suffix,
  tableCaption,
  tableHead,
  valueFormatter = fmt,
}: {
  data: { name: string; value: number }[];
  suffix: string;
  tableCaption: string;
  tableHead: [string, string];
  valueFormatter?: (n: number) => string;
}) {
  // Har bar uchun ~34px + x o'qi uchun joy (o'q yozuvi kesilib qolmasin)
  const height = data.length * 34 + 36;

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID} strokeWidth={1} />
            <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <YAxis
              type="category"
              dataKey="name"
              width={200}
              tickFormatter={(v: string) => (v.length > 26 ? `${v.slice(0, 25)}…` : v)}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(19,145,165,0.06)' }}
              content={<ChartTooltip suffix={suffix} />}
            />
            <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: React.ReactNode) => valueFormatter(Number(v))}
                style={{ fill: MUTED, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        rows={data.map((d) => [d.name, valueFormatter(d.value)])}
        head={tableHead}
        caption={tableCaption}
      />
    </div>
  );
}

/** Vertikal ustunlar — tartiblangan maosh oraliqlari (gistogramma). */
export function SalaryColumns({
  data,
  suffix,
  tableCaption,
  tableHead,
}: {
  data: { name: string; value: number }[];
  suffix: string;
  tableCaption: string;
  tableHead: [string, string];
}) {
  return (
    <div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, bottom: 24, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmt} width={54} />
            <Tooltip
              cursor={{ fill: 'rgba(19,145,165,0.06)' }}
              content={<ChartTooltip suffix={suffix} />}
            />
            <Bar dataKey="value" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable rows={data.map((d) => [d.name, fmt(d.value)])} head={tableHead} caption={tableCaption} />
    </div>
  );
}

/**
 * Ta'lim taqsimoti — 100% gorizontal stacked bar (pie emas: yaqin qiymatlarni
 * solishtirish oson bo'lsin). Segmentlar orasida 2px fon oralig'i.
 */
export function EducationSplit({
  data,
  total,
  tableCaption,
  tableHead,
}: {
  data: { name: string; value: number }[];
  total: number;
  tableCaption: string;
  tableHead: [string, string];
}) {
  const pct = (v: number) => (total ? Math.round((v / total) * 1000) / 10 : 0);

  return (
    <div>
      <div className="flex h-11 w-full overflow-hidden rounded-md" role="img" aria-label={tableCaption}>
        {data.map((d, i) => (
          <div
            key={d.name}
            title={`${d.name}: ${fmt(d.value)} (${pct(d.value)}%)`}
            style={{
              width: `${pct(d.value)}%`,
              background: EDUCATION_RAMP[i] ?? MUTED,
              // 2px fon oralig'i (chegara chizmaymiz)
              marginRight: i < data.length - 1 ? 2 : 0,
            }}
          />
        ))}
      </div>

      {/* Legend har doim bor + to'g'ridan-to'g'ri yozuvlar */}
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm"
              style={{ background: EDUCATION_RAMP[i] ?? MUTED }}
            />
            <span className="text-xs text-siyoh">{d.name}</span>
            <span className="raqam text-xs text-tosh">{pct(d.value)}%</span>
          </li>
        ))}
      </ul>

      <DataTable
        rows={data.map((d) => [d.name, `${fmt(d.value)} (${pct(d.value)}%)`])}
        head={tableHead}
        caption={tableCaption}
      />
    </div>
  );
}

export { ACCENT, INK, MUTED, GRID, SURFACE, Cell };
