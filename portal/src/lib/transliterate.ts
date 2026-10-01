/**
 * Alifbo almashtirish (PLAN §6 — header'dagi "Lotin / Кирилл" tugmasi).
 *
 * Bazada ma'lumot qanday kelgan bo'lsa shunday turadi (89% kirill, 11% lotin),
 * ekranga chiqarishda tanlangan alifboga o'giriladi.
 *
 * Farqi `normalize()` dan: bu yerda apostrof SAQLANADI va katta harf
 * qaytariladi — bu ko'rinadigan matn uchun, qidiruv kaliti uchun emas.
 */

export type Script = 'lat' | 'cyr';

// ---------------------------------------------------------------------------
// Umumiy
// ---------------------------------------------------------------------------

/** Apostrof variantlari — `normalize.ts` dagi APOSTROPHES bilan bir xil to'plam. */
const APOSTROPHE_CHARS = "'‘’‚‛ʻʼʽʹʺ`´′‵";
const APOSTROPHE = new RegExp(`[${APOSTROPHE_CHARS}]`);

const LETTER = /[\p{L}\p{N}]/u;

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

/** "Ц" → "Ts", lekin "ЦЕХ" → "TSEX": keyingi harf ham katta bo'lsa to'liq katta. */
function applyCase(mapped: string, sourceUpper: boolean, nextUpper: boolean): string {
  if (!sourceUpper || !mapped) return mapped;
  if (nextUpper) return mapped.toUpperCase();
  return mapped[0].toUpperCase() + mapped.slice(1);
}

/**
 * Ko'p harfli birikma (Ц → ts, Я → ya, yo' → йў) uchun "atrof katta harfdami?" belgisi:
 * keyingi harf bo'lsa unga, so'z oxirida (keyingi harf yo'q) oldingi harfga qaraymiz —
 * "ЛАБОРАТОРИЯ" → "LABORATORIYA", "Лаборатория" → "Laboratoriya".
 * `start..end` — hozir o'girilayotgan belgilar oralig'i.
 */
function contextUpper(src: string, start: number, end: number): boolean {
  const next = src[end];
  if (next !== undefined && LETTER.test(next)) return isUpper(next);
  const prev = start > 0 ? src[start - 1] : undefined;
  if (prev !== undefined && LETTER.test(prev)) return isUpper(prev);
  return false;
}

// ---------------------------------------------------------------------------
// Kirill → lotin
// ---------------------------------------------------------------------------

const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', ғ: "g'", д: 'd', е: 'e', ё: 'yo', ж: 'j',
  з: 'z', и: 'i', й: 'y', к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', о: 'o',
  ў: "o'", п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ҳ: 'h',
  ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: "'", ы: 'i', ь: '', э: 'e',
  ю: 'yu', я: 'ya',
};

const YE_AFTER = new Set(['а', 'е', 'ё', 'и', 'о', 'у', 'ў', 'э', 'ю', 'я', 'ъ', 'ь']);

function cyrillicToLatin(input: string): string {
  const src = input.normalize('NFC');
  let out = '';

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const lower = ch.toLowerCase();
    const upper = isUpper(ch);
    const nextUpper = contextUpper(src, i, i + 1);

    if (lower === 'е') {
      const prev = i === 0 ? '' : src[i - 1].toLowerCase();
      const mapped = prev === '' || !LETTER.test(prev) || YE_AFTER.has(prev) ? 'ye' : 'e';
      out += applyCase(mapped, upper, nextUpper);
      continue;
    }

    const mapped = CYR_TO_LAT[lower];
    out += mapped === undefined ? ch : applyCase(mapped, upper, nextUpper);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lotin → kirill
// ---------------------------------------------------------------------------

/**
 * Uzunroq mos keladigan birikma avval tekshiriladi. Apostrofli birikmalar (o', g', yo')
 * APOSTROPHE_CHARS dan yasaladi — shunda "oʼ"/"o´" ham ў bo'ladi, "yo'q" esa ё+ъ emas, йў+қ.
 */
const LAT_TO_CYR: [string, string][] = [
  ...[...APOSTROPHE_CHARS].flatMap((a): [string, string][] => [
    [`yo${a}`, 'йў'], [`o${a}`, 'ў'], [`g${a}`, 'ғ'],
  ]),
  ['sh', 'ш'], ['ch', 'ч'], ['ts', 'ц'],
  ['yo', 'ё'], ['yu', 'ю'], ['ya', 'я'], ['ye', 'е'],
  ['a', 'а'], ['b', 'б'], ['v', 'в'], ['g', 'г'], ['d', 'д'],
  ['j', 'ж'], ['z', 'з'], ['i', 'и'], ['y', 'й'], ['k', 'к'],
  ['q', 'қ'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'],
  ['p', 'п'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'],
  ['f', 'ф'], ['x', 'х'], ['h', 'ҳ'],
];

/**
 * "ts" odatda ц (litsenziya, protsess, sotsial), lekin so'z oxiridagi o'zbekcha
 * qo'shimcha chegarasida (ket-sa, ayt-sang, ot-siz) — т + с.
 */
const NATIVE_TS_SUFFIX = /^t(?:sa|sam|sang|sangiz|sak|salar|sin|sinlar|siz|sizlik|sizlar)(?![\p{L}\p{N}])/u;

/** O'zbek lotin alifbosida yo'q harf: w, yoki "ch" tarkibida bo'lmagan c (Coca-Cola, Windows). */
const FOREIGN_LATIN = /w|c(?!h)/i;

function latinWordToCyrillic(src: string): string {
  let out = '';
  let i = 0;

  while (i < src.length) {
    const rest = src.slice(i);
    const lowerRest = rest.toLowerCase();
    const ch = src[i];
    const lower = ch.toLowerCase();

    // ketsa → кетса: 't' ni alohida chiqaramiz, 's' keyingi aylanishda o'z yo'liga tushadi
    if (lower === 't' && NATIVE_TS_SUFFIX.test(lowerRest)) {
      out += isUpper(ch) ? 'Т' : 'т';
      i++;
      continue;
    }

    let matched = false;
    for (const [lat, cyr] of LAT_TO_CYR) {
      if (!lowerRest.startsWith(lat)) continue;

      const upper = isUpper(ch);
      const nextUpper = contextUpper(src, i, i + lat.length);

      out += applyCase(cyr, upper, nextUpper);
      i += lat.length;
      matched = true;
      break;
    }

    if (matched) continue;

    if (lower === 'e') {
      const prev = i === 0 ? '' : src[i - 1];
      const wordStart = prev === '' || !LETTER.test(prev);
      out += applyCase(wordStart ? 'э' : 'е', isUpper(ch), false);
      i++;
      continue;
    }

    // Tutuq belgisi: undoshdan keyingi apostrof → ъ
    if (APOSTROPHE.test(ch)) {
      const prev = i === 0 ? '' : src[i - 1];
      out += prev && LETTER.test(prev) ? 'ъ' : '';
      i++;
      continue;
    }

    out += ch;
    i++;
  }
  return out;
}

/** Bo'shliq bo'yicha bo'laklab, chet harfli so'zlarni (brend, qisqartma) o'z holicha qoldiradi. */
function latinToCyrillic(input: string): string {
  return input
    .normalize('NFC')
    .split(/(\s+)/)
    .map((tok) => (FOREIGN_LATIN.test(tok) ? tok : latinWordToCyrillic(tok)))
    .join('');
}

// ---------------------------------------------------------------------------

/** Matnni tanlangan alifboga o'giradi. Allaqachon o'sha alifboda bo'lsa tegmaydi. */
export function transliterate(text: string | null | undefined, to: Script): string {
  if (!text) return '';
  return to === 'lat' ? cyrillicToLatin(text) : latinToCyrillic(text);
}

/** Matnda kirill harf bormi? */
export function isCyrillic(text: string): boolean {
  return /[Ѐ-ӿ]/.test(text);
}
