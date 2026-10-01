/** Ekranga chiqarish formatlari. Barcha raqamlar bo'shliq bilan ajratiladi. */

import { transliterate } from './transliterate';
import type { Script } from './transliterate';

/**
 * Guruh ajratuvchi — buzilmas bo'shliq (U+00A0). Oddiy bo'shliq bo'lsa raqam
 * satr o'rtasida ikkiga bo'linib ketadi; U+202F (tor NBSP) esa sayt
 * shriftlarida yo'q — ustunlar tekisligi buziladi.
 */
export const NBSP = '\u00a0';

/** 2500000 → "2 500 000" (o'zbekcha ajratuvchi — buzilmas bo'shliq). */
export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '';
  const num = typeof n === 'string' ? Number.parseFloat(n) : n;
  if (!Number.isFinite(num)) return '';
  const rounded = Math.round(num);
  // ICU versiyasiga qarab ajratuvchi U+00A0 yoki U+202F bo'lishi mumkin — bittaga keltiramiz
  return rounded.toLocaleString('ru-RU').replace(/\s/g, NBSP);
}

/** Maosh yoki izoh. `salary` bo'lmasa `salary_note` qaytadi. */
export function formatSalary(
  salary: number | string | null,
  note: string | null,
): { text: string; muted: boolean } {
  if (salary !== null && salary !== undefined) {
    return { text: `${formatNumber(salary)} so'm`, muted: false };
  }
  return { text: note ?? "Kelishuv asosida", muted: true };
}

const MONTHS_LAT = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

/** "2026-07-01" → "1-iyul, 2026". */
export function formatDate(value: string | Date | null | undefined, script: Script = 'lat'): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const text = `${d.getUTCDate()}-${MONTHS_LAT[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
  return script === 'cyr' ? transliterate(text, 'cyr') : text;
}

/** "2026-07-01" → "3 kun oldin" (yaqin sanalar uchun). */
export function formatRelativeDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 0) return formatDate(d);
  if (days === 0) return 'Bugun';
  if (days === 1) return 'Kecha';
  if (days < 30) return `${days} kun oldin`;
  return formatDate(d);
}

/** 1.00 → "1,0 stavka", 0.5 → "0,5 stavka" */
export function formatStavka(v: number | string | null): string {
  if (v === null || v === undefined) return '';
  const n = typeof v === 'string' ? Number.parseFloat(v) : v;
  if (!Number.isFinite(n)) return '';
  return `${n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',') || '0'} stavka`;
}

/** Ta'lim darajasi — bazada kirillcha saqlanadi. */
export const EDUCATION_LEVELS = [
  { db: 'Олий', lat: 'Oliy', cyr: 'Олий' },
  { db: 'Ўрта-махсус', lat: "O'rta-maxsus", cyr: 'Ўрта-махсус' },
  { db: 'Талаб этилмайди', lat: 'Talab etilmaydi', cyr: 'Талаб этилмайди' },
] as const;

export function educationLabel(db: string | null, script: Script = 'lat'): string {
  if (!db) return '';
  const hit = EDUCATION_LEVELS.find((e) => e.db === db);
  return hit ? hit[script] : db;
}

/** Ko'p ishlatiladigan stavka qiymatlari (filtr uchun). */
export const STAVKA_OPTIONS = [
  { value: '0.25', label: '0,25' },
  { value: '0.5', label: '0,5' },
  { value: '0.75', label: '0,75' },
  { value: '1', label: '1,0' },
  { value: '1.5', label: '1,5' },
] as const;

/** Maosh oralig'i filtri uchun tayyor bosqichlar (so'mda). */
export const SALARY_STEPS = [
  { value: '1000000', label: "1 mln dan yuqori" },
  { value: '2000000', label: '2 mln dan yuqori' },
  { value: '3000000', label: '3 mln dan yuqori' },
  { value: '5000000', label: '5 mln dan yuqori' },
] as const;

/** "3 ta o'rin" / bitta bo'lsa — bo'sh satr. */
export function positionsBadge(count: number): string {
  return count > 1 ? `${count} ta o'rin` : '';
}

/** Telefon: "998712449302" → "+998 71 244 93 02" */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  if (digits.length === 9) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

/** Vergul bilan kelgan raqamlarni ajratadi. */
export function splitPhones(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}
