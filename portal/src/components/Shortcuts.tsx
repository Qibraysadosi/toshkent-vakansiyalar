'use client';

import { useEffect } from 'react';

/** "/" tugmasi qidiruv maydonini fokuslaydi (matn kiritayotganda emas). */
export function Shortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const input = document.querySelector<HTMLInputElement>('input[type="search"]');
      if (!input) return;
      e.preventDefault();
      input.focus();
      input.select();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
