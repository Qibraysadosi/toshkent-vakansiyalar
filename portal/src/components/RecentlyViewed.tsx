'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { pushRecent, useRecent } from '@/lib/saved';
import { districtLabel } from '@/lib/districts';
import { transliterate, type Script } from '@/lib/transliterate';

/** Vakansiya sahifasida: ko'rilganlar ro'yxatiga yozadi (render qilmaydi). */
export function TrackView({ id, position, district }: { id: number; position: string; district: string }) {
  useEffect(() => {
    pushRecent({ id, position, district });
  }, [id, position, district]);
  return null;
}

/** Bosh sahifada: yaqinda ko'rilgan vakansiyalar chiplari (bo'lsa). */
export function RecentlyViewed({ script }: { script: Script }) {
  const items = useRecent();
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
      <h2 className="mb-3 text-xs font-600 uppercase tracking-wide text-tosh">
        {script === 'cyr' ? 'Яқинда кўрилганлар' : "Yaqinda ko'rilganlar"}
      </h2>
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {items.map((r) => (
          <li key={r.id} className="shrink-0">
            <Link
              href={`/vakansiya/${r.id}`}
              className="flex max-w-64 flex-col rounded-karta border border-chiziq bg-yuza px-3.5 py-2.5 transition-colors hover:border-chinni"
            >
              <span className="line-clamp-1 text-xs font-500">{transliterate(r.position, script)}</span>
              <span className="text-[11px] text-tosh">{districtLabel(r.district, script)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
