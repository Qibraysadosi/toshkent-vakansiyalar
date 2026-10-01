'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SCRIPT_COOKIE } from '@/lib/script.client';
import type { Script } from '@/lib/transliterate';

/** [qiymat, to'liq nom (sm+ va aria-label), qisqa nom (telefon)] */
const OPTIONS = [
  ['lat', 'Lotin', 'Lat'],
  ['cyr', 'Кирилл', 'Кир'],
] as const;

/**
 * PLAN §6 — header'dagi "Lotin / Кирилл" tugmasi. 320–360px ekranlarda
 * header sig'ishi uchun `sm` dan kichikda qisqa yorliq ko'rsatiladi;
 * ekran o'qigich uchun nom to'liq qoladi (`aria-label`).
 */
export function ScriptToggle({ current }: { current: Script }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Script) {
    if (next === current) return;
    // 1 yil saqlanadi; server komponentlar shu cookie'ni o'qiydi
    document.cookie = `${SCRIPT_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={current === 'cyr' ? 'Алифбо' : 'Alifbo'}
      className="inline-flex overflow-hidden rounded-full border border-chiziq bg-yuza text-xs"
      data-pending={pending}
    >
      {OPTIONS.map(([value, label, short]) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-pressed={current === value}
          aria-label={label}
          className={
            current === value
              ? 'bg-chinni px-2.5 py-1.5 font-medium text-chinni-ustida sm:px-3'
              : 'px-2.5 py-1.5 text-tosh transition-colors hover:text-matn sm:px-3'
          }
        >
          <span className="sm:hidden" aria-hidden>
            {short}
          </span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
