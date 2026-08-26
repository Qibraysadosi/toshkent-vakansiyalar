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

function cyrillicToLatin(input: string): string {
  const src = input.normalize('NFC');
  let out = '';

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const lower = ch.toLowerCase();
    const upper = isUpper(ch);

    // Keyingi harf katta-kichikligini aniqlash (Ц/Ч/Ш kabi digraflar uchun)
    let nextUpper = false;
    for (let j = i + 1; j < src.length; j++) {
      if (!LETTER.test(src[j])) break;
      nextUpper = isUpper(src[j]);
      break;
    }

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

/** Uzunroq mos keladigan birikma avval tekshiriladi. */
const LAT_TO_CYR: [string, string][] = [
  ["o'", 'ў'], ['oʻ', 'ў'], ['o‘', 'ў'], ['o’', 'ў'], ['o`', 'ў'],
  ["g'", 'ғ'], ['gʻ', 'ғ'], ['g‘', 'ғ'], ['g’', 'ғ'], ['g`', 'ғ'],
  ['sh', 'ш'], ['ch', 'ч'], ['ts', 'ц'],
  ['yo', 'ё'], ['yu', 'ю'], ['ya', 'я'], ['ye', 'е'],
  ['a', 'а'], ['b', 'б'], ['v', 'в'], ['g', 'г'], ['d', 'д'],
  ['j', 'ж'], ['z', 'з'], ['i', 'и'], ['y', 'й'], ['k', 'к'],
  ['q', 'қ'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'],
  ['p', 'п'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'],
  ['f', 'ф'], ['x', 'х'], ['h', 'ҳ'], ['c', 'с'], ['w', 'в'],
];

const APOSTROPHE = /['‘’ʻʼ`´]/;

function latinToCyrillic(input: string): string {
  const src = input.normalize('NFC');
  let out = '';
  let i = 0;

  while (i < src.length) {
    const rest = src.slice(i);
    const lowerRest = rest.toLowerCase();
    let matched = false;

    for (const [lat, cyr] of LAT_TO_CYR) {
      if (!lowerRest.startsWith(lat)) continue;

      const source = src.slice(i, i + lat.length);
      const upper = isUpper(source[0]);
      const nextChar = src[i + lat.length];
      const nextUpper = nextChar ? isUpper(nextChar) && LETTER.test(nextChar) : false;

      out += applyCase(cyr, upper, nextUpper);
      i += lat.length;
      matched = true;
      break;
    }

    if (matched) continue;

    const ch = src[i];
    const lower = ch.toLowerCase();

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
