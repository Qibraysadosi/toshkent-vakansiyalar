'use client';

import { useEffect, useState } from 'react';
import { SCRIPT_COOKIE } from '@/lib/script.client';
import type { Script } from '@/lib/transliterate';

const TEXT = {
  lat: {
    title: "Nimadir noto'g'ri ketdi",
    db: "Ma'lumot bazasiga ulanib bo'lmadi. Birozdan keyin qayta urinib ko'ring.",
    dbDev:
      "Ma'lumot bazasiga ulanib bo'lmadi. Lokalda: `npm run db:up` ishga tushganini va `.env.local` dagi DATABASE_URL to'g'riligini tekshiring.",
    generic: "Sahifani qayta yuklab ko'ring. Takrorlansa — bir necha daqiqadan keyin qaytib keling.",
    retry: 'Qayta urinish',
  },
  cyr: {
    title: 'Нимадир нотўғри кетди',
    db: 'Маълумот базасига уланиб бўлмади. Бироздан кейин қайта уриниб кўринг.',
    dbDev:
      'Маълумот базасига уланиб бўлмади. Локалда: `npm run db:up` ишга тушганини ва `.env.local` даги DATABASE_URL тўғрилигини текширинг.',
    generic: 'Саҳифани қайта юклаб кўринг. Такрорланса — бир неча дақиқадан кейин қайтиб келинг.',
    retry: 'Қайта уриниш',
  },
} as const;

/**
 * Kutilmagan xato — yo'l ko'rsatadi, kechirim so'ramaydi (PLAN §5.4).
 * Client komponent: alifbo cookie'dan o'qiladi (hydration mosligi uchun
 * effektda — server 'lat' bilan render qiladi, keyin kerak bo'lsa almashadi).
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [script, setScript] = useState<Script>('lat');

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    try {
      const m = document.cookie.match(new RegExp('(?:^|; )' + SCRIPT_COOKIE + '=(cyr|lat)'));
      if (m?.[1] === 'cyr') setScript('cyr');
    } catch {
      /* cookie o'qib bo'lmasa — lotin qoladi */
    }
  }, []);

  const t = TEXT[script];
  const dbProblem = /DATABASE_URL|ECONNREFUSED|connect/i.test(error.message);
  // Ishlab chiqarishda Next server xabarini yashiradi (faqat digest qoladi) —
  // dev ko'rsatmasi (`npm run db:up`, `.env.local`) foydalanuvchiga ko'rinmasin.
  const dev = process.env.NODE_ENV !== 'production';

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-xl font-600 sm:text-2xl">{t.title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-tosh">{dbProblem ? (dev ? t.dbDev : t.db) : t.generic}</p>
      {error.digest && <p className="raqam mt-3 text-xs text-tosh/70">{error.digest}</p>}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-chinni px-5 py-2 text-xs font-500 text-chinni-ustida transition-colors hover:bg-chinni-toq"
      >
        {t.retry}
      </button>
    </div>
  );
}
