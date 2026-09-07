'use client';

import { useEffect } from 'react';

/** Kutilmagan xato — yo'l ko'rsatadi, kechirim so'ramaydi (PLAN §5.4). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const dbProblem = /DATABASE_URL|ECONNREFUSED|connect/i.test(error.message);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-xl font-600 sm:text-2xl">Nimadir noto&apos;g&apos;ri ketdi</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-tosh">
        {dbProblem
          ? "Ma'lumot bazasiga ulanib bo'lmadi. Lokalda: `npm run db:up` ishga tushganini va `.env.local` dagi DATABASE_URL to'g'riligini tekshiring."
          : "Sahifani qayta yuklab ko'ring. Takrorlansa — bir necha daqiqadan keyin qaytib keling."}
      </p>
      {error.digest && <p className="raqam mt-3 text-xs text-tosh/70">{error.digest}</p>}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-chinni px-5 py-2 text-xs font-500 text-white transition-colors hover:bg-chinni-toq"
      >
        Qayta urinish
      </button>
    </div>
  );
}
