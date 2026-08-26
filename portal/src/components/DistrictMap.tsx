'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DISTRICTS } from '@/lib/districts';
import type { Script } from '@/lib/transliterate';

/**
 * PLAN §5.3 — IMZO ELEMENT. Soddalashtirilgan Toshkent tumanlar xaritasi:
 * har tumanda jonli vakansiya soni, hover'da `chinni` bilan yonadi, bosilganda
 * o'sha tuman ro'yxatiga o'tadi. Mobilda xarita o'rniga 12 ta chip-grid.
 */
/**
 * Poligonni o'z markaziga qarab bir oz kichraytiradi — natijada tumanlar
 * orasida bir xil oraliq paydo bo'ladi va xarita "koshin" (plitka) bo'lib
 * ko'rinadi. Bu dizayn yo'nalishining o'zi (PLAN §5 — "Toshkent koshinlari")
 * va shu bilan birga qo'lda chizilgan poligonlarning notekis tutashuvini
 * yashiradi.
 */
function inset(points: string, factor = 0.965): string {
  const pairs = points.trim().split(/\s+/).map((p) => p.split(',').map(Number) as [number, number]);
  const cx = pairs.reduce((a, [x]) => a + x, 0) / pairs.length;
  const cy = pairs.reduce((a, [, y]) => a + y, 0) / pairs.length;
  return pairs
    .map(([x, y]) => `${(cx + (x - cx) * factor).toFixed(1)},${(cy + (y - cy) * factor).toFixed(1)}`)
    .join(' ');
}

export function DistrictMap({
  counts,
  script,
}: {
  counts: Record<string, number>;
  script: Script;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const nf = new Intl.NumberFormat('ru-RU');
  const active = DISTRICTS.find((d) => d.slug === hovered);

  return (
    <div>
      {/* --- Desktop: xarita ------------------------------------------- */}
      <div className="relative hidden sm:block">
        <svg
          viewBox="0 0 1000 780"
          className="h-auto w-full"
          role="img"
          aria-label={script === 'cyr' ? 'Тошкент туманлари харитаси' : 'Toshkent tumanlari xaritasi'}
        >
          {DISTRICTS.map((d) => {
            const count = counts[d.db] ?? 0;
            const label = script === 'cyr' ? d.cyr : d.lat;
            return (
              <Link
                key={d.slug}
                href={`/tuman/${d.slug}`}
                className="tuman-guruh"
                data-faol={hovered === d.slug}
                onMouseEnter={() => setHovered(d.slug)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(d.slug)}
                onBlur={() => setHovered(null)}
                aria-label={`${label}: ${count}`}
              >
                <polygon points={inset(d.points)} className="tuman-poligon" />
                <text
                  x={d.label[0]}
                  y={d.label[1] - 6}
                  textAnchor="middle"
                  className="fill-siyoh"
                  style={{ fontSize: 21, fontWeight: 600 }}
                >
                  {label}
                </text>
                <text
                  x={d.label[0]}
                  y={d.label[1] + 22}
                  textAnchor="middle"
                  className="fill-chinni"
                  style={{ fontSize: 24, fontWeight: 500, fontFamily: 'var(--font-mono)' }}
                >
                  {nf.format(count).replace(/ /g, ' ')}
                </text>
              </Link>
            );
          })}
        </svg>

        <p className="mt-2 text-center text-xs text-tosh" aria-live="polite">
          {active
            ? `${script === 'cyr' ? active.cyr : active.lat} — ${nf.format(counts[active.db] ?? 0)} ${
                script === 'cyr' ? 'иш ўрни' : "ish o'rni"
              }`
            : script === 'cyr'
              ? 'Туман устига босинг'
              : "Tuman ustiga bosing"}
        </p>
      </div>

      {/* --- Mobil: chip-grid ------------------------------------------- */}
      <ul className="grid grid-cols-2 gap-2 sm:hidden">
        {DISTRICTS.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/tuman/${d.slug}`}
              className="flex items-center justify-between gap-2 rounded-karta border border-chiziq bg-oq px-3 py-2.5 transition-colors hover:border-chinni/50"
            >
              <span className="text-xs">{script === 'cyr' ? d.cyr : d.lat}</span>
              <span className="raqam text-xs text-chinni">{nf.format(counts[d.db] ?? 0)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
