'use client';

import { useSaved } from '@/lib/saved';
import type { Script } from '@/lib/transliterate';

/** Saqlash tugmasi — karta va vakansiya sahifasida. Anchor ichida emas. */
export function SaveButton({
  id,
  script,
  size = 'kichik',
}: {
  id: number;
  script: Script;
  size?: 'kichik' | 'katta';
}) {
  const { has, toggle, ready } = useSaved();
  const saved = ready && has(id);
  const label = saved
    ? script === 'cyr' ? 'Сақланганлардан олиб ташлаш' : 'Saqlanganlardan olib tashlash'
    : script === 'cyr' ? 'Сақлаш' : 'Saqlash';

  const big = size === 'katta';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center gap-2 rounded-full border transition-colors ${
        big ? 'w-full px-4 py-2.5 text-sm sm:w-auto' : 'size-9'
      } ${
        saved
          ? 'border-chinni bg-chinni/12 text-chinni'
          : 'border-chiziq bg-yuza text-tosh hover:border-chinni hover:text-chinni'
      }`}
    >
      <svg
        width={big ? 18 : 16}
        height={big ? 18 : 16}
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
      {big && (saved ? (script === 'cyr' ? 'Сақланган' : 'Saqlangan') : script === 'cyr' ? 'Сақлаш' : 'Saqlash')}
    </button>
  );
}
