'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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

/**
 * Ranglar globals.css dagi --chart-* o'zgaruvchilaridan o'qiladi — shunda
 * yorug'/tungi rejimda mos (validator: oq yuza va #162B45 yuza) palitra
 * qo'llanadi. Recharts CSS var'ni bevosita tushunmaydi, shuning uchun
 * hisoblangan qiymat o'qiladi va mavzu almashganda yangilanadi.
 */
interface ChartTheme {
  accent: string;
  ramp: [string, string, string];
  grid: string;
  muted: string;
  ink: string;
}

const LIGHT: ChartTheme = {
  accent: '#1391A5',
  ramp: ['#094F5B', '#1391A5', '#6FBFCE'],
  grid: '#E2DED5',
  muted: '#66707D',
  ink: '#10233A',
};

function readTheme(): ChartTheme {
  if (typeof window === 'undefined') return LIGHT;
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    accent: v('--chart-accent', LIGHT.accent),
    ramp: [v('--chart-ramp-1', LIGHT.ramp[0]), v('--chart-ramp-2', LIGHT.ramp[1]), v('--chart-ramp-3', LIGHT.ramp[2])],
    grid: v('--chart-grid', LIGHT.grid),
    muted: v('--chart-muted', LIGHT.muted),
    ink: v('--chart-ink', LIGHT.ink),
  };
}

function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(LIGHT);
  useEffect(() => {
    const update = () => setTheme(readTheme());
    update();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      obs.disconnect();
    };
  }, []);
  return theme;
}

const nf = new Intl.NumberFormat('ru-RU');
const fmt = (n: number) => nf.format(Math.round(n)).replace(/ /g, ' ');

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
    <div className="rounded-lg border border-chiziq bg-yuza px-3 py-2 shadow-karta">
      <p className="text-[13px] text-matn">{label}</p>
      <p className="text-[13px] text-tosh">
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
  const th = useChartTheme();
  const axisTick = { fill: th.muted, fontSize: 13 };
  // Har bar uchun ~34px + x o'qi uchun joy (o'q yozuvi kesilib qolmasin)
  const height = data.length * 34 + 36;
  // Telefonda o'q yozuvi uchun kamroq joy — kesilgan nom tooltip/jadvalda to'liq
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640;
  const labelWidth = narrow ? 120 : 200;
  const maxChars = narrow ? 16 : 26;

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={th.grid} strokeWidth={1} />
            <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <YAxis
              type="category"
              dataKey="name"
              width={labelWidth}
              tickFormatter={(v: string) => (v.length > maxChars ? `${v.slice(0, maxChars - 1)}…` : v)}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(19,145,165,0.08)' }}
              content={<ChartTooltip suffix={suffix} />}
            />
            <Bar dataKey="value" fill={th.accent} radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: React.ReactNode) => valueFormatter(Number(v))}
                style={{ fill: th.muted, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
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
  const th = useChartTheme();
  const axisTick = { fill: th.muted, fontSize: 12 };
  return (
    <div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, bottom: 24, left: 0 }}>
            <CartesianGrid vertical={false} stroke={th.grid} strokeWidth={1} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmt} width={54} />
            <Tooltip
              cursor={{ fill: 'rgba(19,145,165,0.08)' }}
              content={<ChartTooltip suffix={suffix} />}
            />
            <Bar dataKey="value" fill={th.accent} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false} />
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
  const th = useChartTheme();
  const ramp = th.ramp;

  return (
    <div>
      <div className="flex h-11 w-full overflow-hidden rounded-md" role="img" aria-label={tableCaption}>
        {data.map((d, i) => (
          <div
            key={d.name}
            title={`${d.name}: ${fmt(d.value)} (${pct(d.value)}%)`}
            style={{
              width: `${pct(d.value)}%`,
              background: ramp[i] ?? th.muted,
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
              style={{ background: ramp[i] ?? th.muted }}
            />
            <span className="text-xs text-matn">{d.name}</span>
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


