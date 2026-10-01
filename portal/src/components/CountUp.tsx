'use client';

import { useEffect, useState } from 'react';

/**
 * PLAN §5.3 — hero ostidagi jonli hisoblagich. Server to'liq raqamni render
 * qiladi (JS'siz/SEO uchun), client hydration'dan keyin 0 dan sanab chiqadi.
 * `prefers-reduced-motion` bo'lsa darhol oxirgi qiymat ko'rsatiladi.
 * Effekt cleanup'i StrictMode'dagi ikki marta chaqirilishni ham to'g'ri
 * hal qiladi: birinchi kadr bekor qilinadi, ikkinchi ishga tushish qayta boshlaydi.
 */
export function CountUp({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      // easeOutCubic — oxiriga borib sekinlashadi
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  // Yakka yirik raqamda tabular-nums kerak emas (u "bo'shashgan" ko'rinadi) —
  // mono faqat ustma-ust turadigan raqamlarda ishlatiladi.
  return <span className="font-500 text-matn">{shown.toLocaleString('ru-RU').replace(/ /g, ' ')}</span>;
}
