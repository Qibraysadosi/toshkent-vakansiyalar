import Link from 'next/link';
import type { Script } from '@/lib/transliterate';

/**
 * PLAN §5.4 — bo'sh holat yo'l ko'rsatadi, kechirim so'ramaydi.
 */
export function EmptyState({ script, hasFilters }: { script: Script; hasFilters: boolean }) {
  const cyr = script === 'cyr';
  return (
    <div className="rounded-karta border border-dashed border-chiziq bg-oq/60 px-6 py-14 text-center">
      <p className="font-display text-lg font-600">
        {cyr ? 'Ҳеч нарса топилмади' : 'Hech narsa topilmadi'}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm text-tosh">
        {cyr
          ? 'Бошқача ёзиб кўринг — масалан, «қоровул» ўрнига «қориқчи». Ёки филтрларни камайтиринг.'
          : "Boshqacha yozib ko'ring — masalan, «qorovul» o'rniga «qoriqchi». Yoki filtrlarni kamaytiring."}
      </p>
      {hasFilters && (
        <Link
          href="/vakansiyalar"
          className="mt-6 inline-block rounded-full bg-chinni px-5 py-2 text-xs font-500 text-white transition-colors hover:bg-chinni-toq"
        >
          {cyr ? 'Филтрларни тозалаш' : 'Filtrlarni tozalash'}
        </Link>
      )}
    </div>
  );
}
