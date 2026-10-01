'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { Script } from '@/lib/transliterate';

type Theme = 'light' | 'dark' | 'system';
const COOKIE = 'mavzu';
const ORDER: Theme[] = ['system', 'light', 'dark'];

const LABEL = {
  lat: { system: 'Tizim', light: "Yorug'", dark: 'Tungi', title: 'Mavzu' },
  cyr: { system: 'Тизим', light: 'Ёруғ', dark: 'Тунги', title: 'Мавзу' },
} as const;

function Icon({ theme }: { theme: Theme }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (theme === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 18v3" />
    </svg>
  );
}

/**
 * Yorug' / tungi / tizim — bosilganda navbatdagisiga o'tadi. Cookie server
 * tomonda o'qiladi (sahifa miltillamaydi), `data-theme` esa darhol
 * o'rnatiladi (kutmasdan almashadi).
 */
export function ThemeToggle({ current, script }: { current: Theme; script: Script }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const t = LABEL[script];

  function next() {
    const value = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    const root = document.documentElement;
    if (value === 'system') {
      delete root.dataset.theme;
      document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
    } else {
      root.dataset.theme = value;
      document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={next}
      title={`${t.title}: ${t[current]}`}
      aria-label={`${t.title}: ${t[current]}`}
      className="relative inline-flex size-9 items-center justify-center rounded-full border border-chiziq bg-yuza text-tosh transition-colors before:absolute before:-inset-1 before:content-[''] hover:border-chinni hover:text-chinni"
    >
      <Icon theme={current} />
    </button>
  );
}
