/**
 * Qidiruv normallashtirish — PLAN.md §3.1.
 *
 * BITTA MANBA: import, sayt qidiruvi va Telegram bot AYNAN shu funksiyani
 * ishlatadi. Aks holda `position_search` ustunidagi qiymat qidiruv so'rovi
 * bilan mos kelmay qoladi.
 *
 * Maqsad: "Қоровул" = "qorovul" = "Qorovul" = "qo'rovul" — bitta kalit.
 * Bazada 62 ta "qorovul" bor, ularning atigi 5 tasi lotinchada yozilgan.
 *
 * Bog'liqliksiz (dependency-free) — bot va skriptlarda ham ishlaydi.
 */

/** Kirill → lotin. Kalitlar faqat kichik harfda: matn avval lowercase qilinadi. */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  ғ: "g'",
  д: 'd',
  е: 'e', // so'z boshida "ye" — pastdagi YE_AFTER qoidasiga qarang
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  қ: 'q',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  ў: "o'",
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ҳ: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh', // ruscha lavozimlarda uchraydi: "уборщица"
  ъ: "'", // tutuq belgisi — apostrof sifatida, keyin olib tashlanadi
  ы: 'i', // ruscha
  ь: '', // ruscha yumshatish belgisi — tashlanadi
  э: 'e',
  ю: 'yu',
  я: 'ya',
  // Boshqa kirill alifbolaridan tasodifan tushib qolganlari
  ә: 'a',
  ө: 'o',
  ү: 'u',
  ұ: 'u',
  һ: 'h',
  ң: 'ng',
  ҷ: 'j',
  ҭ: 't',
  і: 'i',
  ї: 'i',
  є: 'e',
  ѐ: 'e',
  ј: 'j',
  ѓ: 'g',
  ќ: 'k',
  ђ: 'd',
  ћ: 'c',
  љ: 'l',
  њ: 'n',
  џ: 'j',
};

/**
 * Kirill "е" shu belgilardan keyin (yoki so'z boshida) "ye" o'qiladi —
 * o'zbek transliteratsiya me'yori: "ер" → "yer", lekin "мебел" → "mebel".
 */
const YE_AFTER = new Set(['а', 'е', 'ё', 'и', 'о', 'у', 'ў', 'э', 'ю', 'я', 'ъ', 'ь']);

/**
 * Apostrofning barcha ko'rinishlari. `o'qituvchi`, `oʻqituvchi`, `o`qituvchi`,
 * `o'qituvchi` — hammasi bir xil kalitga tushishi uchun butunlay olib tashlanadi.
 */
const APOSTROPHES = /['‘’‚‛ʻʼʽʹʺ`´′'‵]/g;

/** Kirill harfmi? (asosiy blok + kengaytma) */
const CYRILLIC_RE = /[Ѐ-ӿԀ-ԯ]/;

/**
 * Qidiruv kaliti. Import paytida `position_search` / `name_search` ustunlariga
 * shu shakl yoziladi, qidiruvda so'rov ham xuddi shu funksiyadan o'tkaziladi.
 */
export function normalize(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';

  // NFC — "ў" ba'zi fayllarda "у" + birlashtiruvchi belgi bo'lib keladi.
  const lower = String(input).normalize('NFC').toLowerCase();

  let out = '';
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];

    if (ch === 'е') {
      const prev = i === 0 ? '' : lower[i - 1];
      // So'z boshi yoki unli/belgidan keyin → "ye"
      out += prev === '' || !/[\p{L}\p{N}]/u.test(prev) || YE_AFTER.has(prev) ? 'ye' : 'e';
      continue;
    }

    const mapped = CYRILLIC_TO_LATIN[ch];
    out += mapped === undefined ? ch : mapped;
  }

  return out
    .replace(APOSTROPHES, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ko'rinadigan matnni tozalash (PLAN.md §2.4) — bazaga original yozuvda,
 * lekin ortiqcha bo'shliq va qavslovchi qo'shtirnoqlarsiz saqlanadi.
 * Excel'da 933 ta katakda ikkilangan bo'shliq, 28 tasida qo'shtirnoq bor.
 */
export function cleanText(input: unknown): string {
  if (input === null || input === undefined) return '';
  let s = String(input).normalize('NFC').replace(/\s+/g, ' ').trim();

  // Faqat muvozanatli qavslovchi qo'shtirnoqlar olib tashlanadi:
  // «FOO» / "FOO" / “FOO” → FOO, lekin  "FOO" MCHJ  tegilmaydi.
  const pairs: [string, string][] = [
    ['"', '"'],
    ['“', '”'],
    ['«', '»'],
    ['‘', '’'],
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const [open, close] of pairs) {
      if (s.length > 1 && s.startsWith(open) && s.endsWith(close) && !s.slice(1, -1).includes(close)) {
        s = s.slice(1, -1).trim();
        changed = true;
      }
    }
  }
  return s;
}

/** Matnda kirill harflari bormi? (import sifat hisoboti uchun) */
export function hasCyrillic(input: string | null | undefined): boolean {
  return input ? CYRILLIC_RE.test(input) : false;
}
