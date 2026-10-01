import Link from 'next/link';
import type { Script } from '@/lib/transliterate';

/**
 * PLAN §5.4 — bo'sh holat yo'l ko'rsatadi, kechirim so'ramaydi.
 * PLAN §9 — bot mavjud bo'lsa (`NEXT_PUBLIC_TG_BOT`), obuna CTA ko'rsatiladi.
 */
export function EmptyState({ script, hasFilters }: { script: Script; hasFilters: boolean }) {
  const cyr = script === 'cyr';
  const bot = process.env.NEXT_PUBLIC_TG_BOT?.trim().replace(/^@/, '');
  return (
    <div className="rounded-karta border border-dashed border-chiziq bg-yuza/60 px-6 py-14 text-center">
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
          className="mt-6 inline-block rounded-full bg-chinni px-5 py-2 text-xs font-500 text-chinni-ustida transition-colors hover:bg-chinni-toq"
        >
          {cyr ? 'Филтрларни тозалаш' : 'Filtrlarni tozalash'}
        </Link>
      )}
      {bot && (
        <p className="mt-5 text-xs text-tosh">
          {cyr ? 'Янги вакансиялардан хабардор бўлинг: ' : "Yangi vakansiyalardan xabardor bo'ling: "}
          <a
            href={`https://t.me/${bot}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-chinni underline underline-offset-4 hover:text-chinni-toq"
          >
            {cyr ? 'Telegram бот' : 'Telegram bot'}
          </a>
        </p>
      )}
    </div>
  );
}
