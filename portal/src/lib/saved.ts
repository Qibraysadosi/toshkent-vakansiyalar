'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Saqlangan vakansiyalar va yaqinda ko'rilganlar — brauzer localStorage'ida,
 * ro'yxatdan o'tishsiz. Bir nechta tab bir vaqtda ochiq bo'lsa `storage`
 * hodisasi orqali sinxronlanadi.
 */

const SAVED_KEY = 'saqlangan';
const RECENT_KEY = 'korilgan';
const RECENT_MAX = 8;
const SAVED_MAX = 100;

export interface RecentItem {
  id: number;
  position: string;
  district: string;
  ts: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new StorageEvent('storage', { key }));
  } catch {
    /* private rejim yoki to'lgan xotira — jimgina o'tkazamiz */
  }
}

export function useSaved() {
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setIds(read<number[]>(SAVED_KEY, []));
    sync();
    setReady(true);
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const toggle = useCallback((id: number) => {
    const current = read<number[]>(SAVED_KEY, []);
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current].slice(0, SAVED_MAX);
    write(SAVED_KEY, next);
    setIds(next);
  }, []);

  const remove = useCallback((id: number) => {
    const next = read<number[]>(SAVED_KEY, []).filter((x) => x !== id);
    write(SAVED_KEY, next);
    setIds(next);
  }, []);

  const clear = useCallback(() => {
    write(SAVED_KEY, []);
    setIds([]);
  }, []);

  return { ids, ready, toggle, remove, clear, has: (id: number) => ids.includes(id) };
}

export function pushRecent(item: Omit<RecentItem, 'ts'>) {
  const current = read<RecentItem[]>(RECENT_KEY, []).filter((r) => r.id !== item.id);
  write(RECENT_KEY, [{ ...item, ts: Date.now() }, ...current].slice(0, RECENT_MAX));
}

export function useRecent() {
  const [items, setItems] = useState<RecentItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read<RecentItem[]>(RECENT_KEY, []));
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return items;
}
