import { normalize } from './normalize';

/**
 * Xatoga chidamli qidiruv — PLAN.md §3.1 kengaytmasi.
 *
 * Bog'liqliksiz (dependency-free), bazaga murojaat qilmaydi: sayt, bot va
 * testlar bir xil ishlatadi. Ma'lumot (lavozimlar ro'yxati) va SQL — queries.ts da.
 */

/**
 * normalize() kalitining "klaviaturaga chidamli" shakli: rus klaviaturasida
 * eng ko'p adashtiriladigan juftlar bitta harfga tushadi — қ/к → k, ҳ/х → h
 * ("Коровул" = "Қоровул", "хамшира" = "ҳамшира").
 *
 * SQL nusxasi: `translate(col, 'qx', 'kh')` (queries.ts → LOOSE). Harfma-harf
 * almashtirish bo'lgani uchun satr ichidagi moslik saqlanadi — aniq qidiruv
 * natijalari yo'qolmaydi, faqat ko'payadi.
 */
export function loose(norm: string): string {
  return norm.replace(/q/g, 'k').replace(/x/g, 'h');
}

/** Qo'sh harflar bittaga: "farrosh" → "farosh". Faqat o'xshashlik solishtiruvida. */
export function squeeze(s: string): string {
  return s.replace(/(.)\1+/gu, '$1');
}

/** So'z uzunligiga qarab ruxsat etilgan xato (tahrir) soni: qisqa so'zda xato tuzatilmaydi. */
export function maxEdits(length: number): number {
  return length < 5 ? 0 : length <= 8 ? 1 : 2;
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/**
 * Harf almashtirish narxi: unli ↔ unli — 1 ("qarovul" ~ "qorovul", "укитувчи"
 * ~ "ўқитувчи"), qolgani — 2. Undosh almashsa, odatda boshqa so'z bo'ladi
 * ("oqtuvchi" ≠ "ortuvchi"), xato emas.
 */
const substitution = (x: string, y: string) => (x === y ? 0 : VOWELS.has(x) && VOWELS.has(y) ? 1 : 2);

/**
 * `a` ni `b` ga aylantirish narxi (Damerau–Levenshtein, OSA: harf qo'shish,
 * o'chirish, yonma-yon ikki harf o'rnini almashtirish — 1; almashtirish —
 * `substitution`). `prefix` — `b` ning boshlanishi bilan solishtiriladi,
 * qolgani qo'shimcha hisoblanadi ("qorovul" ~ "qorovuli" = 0). `max` dan
 * oshsa — `max + 1` (hisob erta to'xtaydi).
 */
export function editDistance(a: string, b: string, max: number, prefix = false): number {
  const n = a.length;
  const m = b.length;
  if (prefix ? m < n - max : Math.abs(n - m) > max) return max + 1;

  let prev2 = new Array<number>(m + 1).fill(0);
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  let cur = new Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= m; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + substitution(a[i - 1], b[j - 1]));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  const d = prefix ? Math.min(...prev) : prev[m];
  return d > max ? max + 1 : d;
}

/** Lavozimlar ro'yxatining bir yozuvi (queries.ts → getSearchIndex). */
export interface IndexEntry {
  /** normalize(lavozim) — qidiruv kaliti */
  ps: string;
  /** Shu kalitdagi eng ko'p uchragan asl yozuv (kirill yoki lotin) */
  label: string;
  /** Vakansiya yozuvlari soni */
  n: number;
  /** Ish o'rinlari soni */
  p: number;
}

const SPLIT = /[^\p{L}\p{N}]+/u;
const words = (norm: string) => norm.split(SPLIT).filter(Boolean);

/**
 * So'rovga o'xshash lavozimlar. So'rovdagi har so'z (3+ harf) lavozimdagi
 * biror so'zga mos kelishi kerak: so'z ichida bo'lsa — 0 xato, aks holda so'z
 * boshlanishiga `maxEdits` tagacha xato bilan (qo'shimcha va qo'sh harf
 * hisobga olinmaydi). So'zlar tartibi muhim emas. Tartib: kam xato, keyin
 * ko'p vakansiya.
 */
export function findSimilar(qNorm: string, entries: IndexEntry[], limit: number): IndexEntry[] {
  const qWords = words(qNorm)
    .map((w) => squeeze(loose(w)))
    .filter((w) => w.length >= 3);
  if (qWords.length === 0) return [];

  const scored: { e: IndexEntry; errors: number }[] = [];
  for (const e of entries) {
    const dWords = words(e.ps).map((w) => squeeze(loose(w)));
    let errors = 0;
    for (const qw of qWords) {
      const max = maxEdits(qw.length);
      let best = max + 1;
      for (const dw of dWords) {
        if (dw.includes(qw)) {
          best = 0;
          break;
        }
        if (max > 0) best = Math.min(best, editDistance(qw, dw, Math.min(max, best - 1), true));
      }
      if (best > max) {
        errors = -1;
        break;
      }
      errors += best;
    }
    if (errors >= 0) scored.push({ e, errors });
  }
  scored.sort((x, y) => x.errors - y.errors || y.e.n - x.e.n);
  return scored.slice(0, limit).map((s) => s.e);
}

/** So'z: harf, raqam va so'z ichidagi apostroflar (normalize ularni olib tashlaydi). */
const WORD_RE = /[\p{L}\p{M}\p{N}'‘’‚‛`´′‵]+/gu;
const CLEAN_KEY = /^[\p{L}\p{N}]+$/u;
const EDGE_PUNCT = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/** So'rovdagi so'z shundan ko'p bo'lmagan yozuvda uchrasa — "notanish" hisoblanadi. */
const RARE = 2;
/** Notanish bo'lmasa, taklif kamida shuncha marta ko'p uchrashi kerak. */
const MUCH_MORE = 10;
/** Taklif kamida shuncha yozuvda uchrashi kerak. */
const MIN_SUPPORT = 5;

/**
 * "Balki shuni qidirgandirsiz" — so'rovdagi kam uchraydigan so'zni bazadagi
 * eng yaqin (eng kam xato, keyin eng ko'p uchragan) va ancha ko'p uchraydigan
 * so'z bilan almashtiradi.
 *
 * Almashtirilgan so'z bazadagi eng ko'p uchragan asl shaklida qaytadi
 * (masalan "ўқитувчи"), qolganlari foydalanuvchi yozganicha — natijani
 * ekranga transliterate() bilan chiqarish xavfsiz. Almashtiradigan so'z
 * bo'lmasa — null.
 */
export function suggestQuery(qRaw: string, entries: IndexEntry[]): string | null {
  const rows = entries.map((e) => ({ loose: loose(e.ps), n: e.n }));
  /** Shu bo'lak uchraydigan vakansiya yozuvlari soni. */
  const support = (part: string) => rows.reduce((sum, r) => (r.loose.includes(part) ? sum + r.n : sum), 0);

  // Lavozimlardagi so'zlar: kalit → solishtirish shakli, soni, asl shakllari
  const stats = new Map<string, { sq: string; count: number; forms: Map<string, number> }>();
  for (const e of entries) {
    for (const [form] of e.label.toLowerCase().matchAll(WORD_RE)) {
      const key = normalize(form);
      if (key.length < 3 || !CLEAN_KEY.test(key)) continue;
      let s = stats.get(key);
      if (!s) stats.set(key, (s = { sq: squeeze(loose(key)), count: 0, forms: new Map() }));
      s.count += e.n;
      s.forms.set(form, (s.forms.get(form) ?? 0) + e.n);
    }
  }

  let changed = false;
  const tokens = qRaw.trim().split(/\s+/).filter(Boolean);
  const out = tokens.map((token) => {
    const key = normalize(token).replace(EDGE_PUNCT, '');
    if (key.length < 3 || !CLEAN_KEY.test(key)) return token;
    const sq = squeeze(loose(key));
    const max = maxEdits(sq.length);

    let best: { key: string; errors: number; count: number } | null = null;
    for (const [k, s] of stats) {
      if (k === key) continue;
      const errors = editDistance(sq, s.sq, max);
      if (errors > max) continue;
      if (!best || errors < best.errors || (errors === best.errors && s.count > best.count)) {
        best = { key: k, errors, count: s.count };
      }
    }
    if (!best) return token;

    const current = support(loose(key));
    const proposed = support(loose(best.key));
    if (proposed < MIN_SUPPORT || (current > RARE && proposed < current * MUCH_MORE)) return token;

    changed = true;
    return mostCommon(stats.get(best.key)!.forms);
  });

  return changed ? out.join(' ') : null;
}

function mostCommon(forms: Map<string, number>): string {
  let top = '';
  let max = -1;
  for (const [form, n] of forms) {
    if (n > max) {
      top = form;
      max = n;
    }
  }
  return top;
}
