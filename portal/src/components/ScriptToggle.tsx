'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SCRIPT_COOKIE } from '@/lib/script.client';
import type { Script } from '@/lib/transliterate';

/** PLAN §6 — header'dagi "Lotin / Кирилл" tugmasi. */
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
      aria-label="Alifbo"
      className="inline-flex overflow-hidden rounded-full border border-chiziq bg-oq text-xs"
      data-pending={pending}
    >
      {(
        [
          ['lat', 'Lotin'],
          ['cyr', 'Кирилл'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-pressed={current === value}
          className={
            current === value
              ? 'bg-chinni px-3 py-1.5 font-medium text-white'
              : 'px-3 py-1.5 text-tosh transition-colors hover:text-siyoh'
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
