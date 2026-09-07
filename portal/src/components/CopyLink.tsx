'use client';

import { useState } from 'react';
import type { Script } from '@/lib/transliterate';

/** Havolani nusxalash — Telegramdan tashqari ulashish uchun. */
export function CopyLink({ url, script }: { url: string; script: Script }) {
  const [done, setDone] = useState(false);
  const label = script === 'cyr' ? 'Ҳаволани нусхалаш' : 'Havolani nusxalash';
  const doneLabel = script === 'cyr' ? 'Нусхаланди' : 'Nusxalandi';

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      window.prompt(label, url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-karta border border-chiziq px-4 py-2.5 text-center text-sm text-tosh transition-colors hover:border-chinni hover:text-chinni"
      aria-live="polite"
    >
      {done ? '✓ ' + doneLabel : label}
    </button>
  );
}
