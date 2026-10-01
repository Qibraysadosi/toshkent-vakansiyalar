/**
 * Excel → baza o'girish va tozalash qoidalari (PLAN.md §1–§2).
 *
 * Bu modul SOF: fayl ham, tarmoq ham yo'q. Shuning uchun qoidalarni
 * unit-test bilan qotirib qo'yish mumkin (import-transform.test.ts).
 */

import { createHash } from 'node:crypto';
import { cleanText, hasCyrillic, normalize } from './normalize';
import type { CompanyRow, VacancyRow } from './database.types';

/** Excel'dagi 11 ustun — kirillcha sarlavhalar (PLAN §1, o'zgartirilmasin). */
export const EXCEL_HEADERS = {
  district: 'Туман (шаҳар)',
  stir: 'СТИР (ИНН)',
  company: 'Ташкилот (корхона) номи',
  phone: 'Ташкилот телефон рақами',
  department: 'Бўлим номи',
  position: 'Лавозими',
  posted_date: 'Вакансия юборилган сана',
  stavka: 'Ставка',
  salary: 'Маош',
  education: 'Таълим',
  quota: 'Квота йўналиши',
} as const;

export type FieldName = keyof typeof EXCEL_HEADERS;

/** Ustunlar shu tartibda kelishi kutiladi (sarlavha topilmasa — zaxira). */
export const FIELD_ORDER: FieldName[] = [
  'district', 'stir', 'company', 'phone', 'department',
  'position', 'posted_date', 'stavka', 'salary', 'education', 'quota',
];

/** PLAN §2.1 — bazada 8 ta qator 1,9 mlrd so'mgacha "maosh" ko'rsatgan. */
export const MAX_PLAUSIBLE_SALARY = 100_000_000;

/**
 * Pastki chegara — PLAN'da yo'q, real ma'lumotdan chiqdi: 61 qatorda maosh
 * 9 so'm / 1 so'm / 600 so'm deb yozilgan. Eng kichik stavka (0.01) bilan ham
 * minimal ish haqi ~11 550 so'm bo'ladi, ya'ni 10 000 dan pasti — texnik xato.
 */
export const MIN_PLAUSIBLE_SALARY = 10_000;

export const SALARY_NOTE_SCHEDULE = "Shtat jadvali bo'yicha";
export const SALARY_NOTE_UNCLEAR = 'Aniqlashtirilmoqda';

export interface ImportError {
  row: number;
  reason: string;
  value?: string;
}

export interface ImportReport {
  rowsRead: number;
  rowsMerged: number;
  duplicatesMerged: number;
  companies: number;
  districts: number;
  salaryNumeric: number;
  salaryScheduleNote: number;
  salaryTooHigh: number;
  salaryTooLow: number;
  positionsCyrillic: number;
  positionsLatin: number;
  skipped: number;
  errors: ImportError[];
}

export interface TransformResult {
  companies: CompanyRow[];
  vacancies: Omit<VacancyRow, 'id' | 'views' | 'is_hidden'>[];
  report: ImportReport;
}

/**
 * Vakansiyaning barqaror identifikatori. Sana KIRMAYDI — bir xil vakansiya
 * keyingi oy yangi sana bilan kelsa ham o'sha id'ni saqlab qoladi (saqlangan
 * ro'yxat, ulashilgan havola, Telegram xabari buzilmaydi). Bitta fayl ichida
 * faqat sanasi farq qiladigan qatorlar ham birlashtiriladi.
 */
export function fingerprintOf(r: {
  stir: string; district: string; department: string; position: string;
  stavka: number | null; salary: number | null; salary_note: string | null;
  education: string; quota: string;
}): string {
  const key = [
    r.stir, r.district, r.department, r.position,
    r.stavka ?? '', r.salary ?? '', r.salary_note ?? '', r.education, r.quota,
  ].join('\u001f');
  return createHash('md5').update(key).digest('hex');
}

// ---------------------------------------------------------------------------
// Alohida maydon parserlari
// ---------------------------------------------------------------------------

/** PLAN §2.3 — STIR har doim string, boshidagi nol saqlanadi. */
export function parseStir(raw: unknown): string | null {
  const s = cleanText(raw).replace(/\s/g, '');
  if (!s || !/^\d{1,9}$/.test(s)) return null;
  return s.padStart(9, '0');
}

/**
 * PLAN §2.1 — raqam bo'lsa salary, matn bo'lsa izoh, cheklardan chiqsa
 * "Aniqlashtirilmoqda".
 */
export function parseSalary(raw: unknown): { salary: number | null; salary_note: string | null } {
  const s = cleanText(raw);
  if (!s) return { salary: null, salary_note: SALARY_NOTE_SCHEDULE };

  // "1 250 000,50" / "1250000.50" / "1 250 000" — ajratuvchilarni tozalash
  const compact = s.replace(/[\s  ']/g, '');
  const numeric = /^\d+([.,]\d+)?$/.test(compact) ? Number.parseFloat(compact.replace(',', '.')) : null;

  if (numeric === null || !Number.isFinite(numeric)) {
    // "Ish haqi shtat jadvaliga (ichki tarif rejasi) muvofiq belgilanadi"
    return { salary: null, salary_note: SALARY_NOTE_SCHEDULE };
  }
  if (numeric > MAX_PLAUSIBLE_SALARY || numeric < MIN_PLAUSIBLE_SALARY) {
    return { salary: null, salary_note: SALARY_NOTE_UNCLEAR };
  }
  return { salary: Math.round(numeric * 100) / 100, salary_note: null };
}

/**
 * Haqiqiy kalendar sanasi bo'lsa "YYYY-MM-DD", aks holda null (31.04, 30.02,
 * 13-oy ...). Faqat oy/kun chegarasini tekshirish yetmaydi: "2026-04-31"
 * Postgres `date` ustuniga yozilganda butun import tranzaksiyasi yiqiladi.
 */
function calendarDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "DD.MM.YYYY" → "YYYY-MM-DD". Excel seriya raqamini ham qabul qiladi. */
export function parseDate(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Excel seriya raqami: 1899-12-30 dan boshlanadi
    const ms = Math.round((raw - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = cleanText(raw);
  const dotted = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/.exec(s);
  if (dotted) return calendarDate(Number(dotted[3]), Number(dotted[2]), Number(dotted[1]));
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return null;
}

/** "1.00" / "0,5" → 1 / 0.5. numeric(4,2) ga sig'masa — NULL. */
export function parseStavka(raw: unknown): number | null {
  const s = cleanText(raw).replace(',', '.');
  if (!s) return null;
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n <= 0 || n >= 100) return null;
  return Math.round(n * 100) / 100;
}

/** Bir nechta raqam vergul bilan keladi — bo'shliqlar tartibga solinadi. */
export function parsePhone(raw: unknown): string | null {
  const s = cleanText(raw);
  if (!s) return null;
  const parts = s
    .split(/[,;/]+/)
    .map((p) => p.replace(/[^\d+]/g, '').trim())
    .filter((p) => p.length >= 7);
  const unique = [...new Set(parts)];
  return unique.length ? unique.join(', ') : null;
}

// ---------------------------------------------------------------------------
// Sarlavhalarni ustun indeksiga bog'lash
// ---------------------------------------------------------------------------

/**
 * Sarlavha qatorini o'qib, har bir maydon uchun ustun indeksini qaytaradi.
 * Solishtirish normalize() orqali — sarlavha lotinchada yozilsa ham topiladi.
 */
export function mapHeaders(headerRow: unknown[]): { index: Record<FieldName, number>; matchedByName: boolean } {
  const normalizedHeader = headerRow.map((h) => normalize(cleanText(h)));
  const index = {} as Record<FieldName, number>;
  let matched = 0;

  for (const field of FIELD_ORDER) {
    const want = normalize(EXCEL_HEADERS[field]);
    let at = normalizedHeader.indexOf(want);
    if (at === -1) {
      // Qavs ichidagi izohsiz ham urinib ko'ramiz: "tuman (shahar)" → "tuman"
      const short = want.replace(/\s*\(.*?\)\s*/g, ' ').trim();
      at = normalizedHeader.findIndex((h) => h === short || h.startsWith(short));
    }
    index[field] = at;
    if (at !== -1) matched++;
  }

  if (matched === FIELD_ORDER.length) return { index, matchedByName: true };

  // Zaxira: 11 ustun kutilgan tartibda deb qabul qilamiz
  for (let i = 0; i < FIELD_ORDER.length; i++) index[FIELD_ORDER[i]] = i;
  return { index, matchedByName: false };
}

// ---------------------------------------------------------------------------
// Asosiy o'girish
// ---------------------------------------------------------------------------

interface CleanRow {
  district: string;
  stir: string;
  company: string;
  phone: string | null;
  department: string;
  position: string;
  posted_date: string | null;
  stavka: number | null;
  salary: number | null;
  salary_note: string | null;
  education: string;
  quota: string;
}

/** Eng ko'p uchragan qiymat (bir xil sonda bo'lsa — birinchisi). */
function mode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0] ?? '';
  let bestCount = -1;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/**
 * Xom Excel qatorlarini (sarlavhasiz) tozalab, `companies` va `vacancies`
 * yozuvlariga aylantiradi. Bir xil qatorlar birlashtirilib `positions_count`
 * ga yig'iladi (PLAN §2.2).
 */
export function transformRows(
  dataRows: unknown[][],
  headerRow: unknown[],
  importBatch: string,
): TransformResult {
  const { index, matchedByName } = mapHeaders(headerRow);
  const errors: ImportError[] = [];

  if (!matchedByName) {
    errors.push({
      row: 1,
      reason:
        "Sarlavhalar nom bo'yicha topilmadi — ustunlar PLAN §1 tartibida deb o'qildi. " +
        'Faylni tekshiring.',
      value: headerRow.map((h) => cleanText(h)).join(' | ').slice(0, 300),
    });
  }

  const at = (row: unknown[], field: FieldName) => row[index[field]];

  const clean: CleanRow[] = [];
  let salaryNumeric = 0;
  let salaryScheduleNote = 0;
  let salaryTooHigh = 0;
  let salaryTooLow = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const excelRow = i + 2; // 1-qator sarlavha, Excel 1'dan sanaydi

    // Butunlay bo'sh qatorlarni jimgina tashlaymiz
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;

    const stir = parseStir(at(row, 'stir'));
    const position = cleanText(at(row, 'position'));
    const district = cleanText(at(row, 'district'));

    if (!stir) {
      errors.push({ row: excelRow, reason: "STIR bo'sh yoki noto'g'ri", value: cleanText(at(row, 'stir')) });
      continue;
    }
    if (!position) {
      errors.push({ row: excelRow, reason: "Lavozim bo'sh" });
      continue;
    }
    if (!district) {
      errors.push({ row: excelRow, reason: "Tuman bo'sh" });
      continue;
    }

    const rawSalary = at(row, 'salary');
    const { salary, salary_note } = parseSalary(rawSalary);
    if (salary !== null) {
      salaryNumeric++;
    } else if (salary_note === SALARY_NOTE_UNCLEAR) {
      const compact = cleanText(rawSalary).replace(/[\s  ']/g, '').replace(',', '.');
      if (Number.parseFloat(compact) > MAX_PLAUSIBLE_SALARY) salaryTooHigh++;
      else salaryTooLow++;
    } else {
      salaryScheduleNote++;
    }

    // Tushunarsiz sana qatorni tashlamaydi — bo'sh qoladi, lekin hisobotda
    // Excel qatori bilan ko'rinadi (aks holda xato jimgina yo'qolardi).
    const rawDate = at(row, 'posted_date');
    const posted_date = parseDate(rawDate);
    if (posted_date === null && cleanText(rawDate)) {
      errors.push({ row: excelRow, reason: "Sana noto'g'ri — bo'sh qoldirildi", value: cleanText(rawDate) });
    }

    clean.push({
      district,
      stir,
      company: cleanText(at(row, 'company')),
      phone: parsePhone(at(row, 'phone')),
      department: cleanText(at(row, 'department')),
      position,
      posted_date,
      stavka: parseStavka(at(row, 'stavka')),
      salary,
      salary_note,
      education: cleanText(at(row, 'education')),
      quota: cleanText(at(row, 'quota')),
    });
  }

  // --- PLAN §2.2: bir xil qatorlarni birlashtirish -------------------------
  // Kalit — fingerprint (sanasiz). Sanasi farq qilgan takrorlar ham bitta
  // yozuvga yig'iladi; eng so'nggi sana saqlanadi. Shu kalit bazada ham
  // unikal: keyingi oy bir xil vakansiya o'z id'sini saqlab qoladi.
  const merged = new Map<string, { row: CleanRow; count: number }>();
  for (const r of clean) {
    const fp = fingerprintOf(r);
    const hit = merged.get(fp);
    if (hit) {
      hit.count++;
      if (r.posted_date && (!hit.row.posted_date || r.posted_date > hit.row.posted_date)) {
        hit.row = { ...hit.row, posted_date: r.posted_date };
      }
    } else {
      merged.set(fp, { row: r, count: 1 });
    }
  }

  const vacancies: Omit<VacancyRow, 'id' | 'views' | 'is_hidden'>[] = [];
  let positionsCyrillic = 0;
  let positionsLatin = 0;

  for (const [fingerprint, { row, count }] of merged) {
    if (hasCyrillic(row.position)) positionsCyrillic++;
    else positionsLatin++;

    vacancies.push({
      stir: row.stir,
      district: row.district,
      department: row.department || null,
      position: row.position,
      position_search: normalize(row.position),
      posted_date: row.posted_date,
      stavka: row.stavka,
      salary: row.salary,
      salary_note: row.salary_note,
      education: row.education || null,
      quota: row.quota || null,
      positions_count: count,
      import_batch: importBatch,
      fingerprint,
    });
  }

  // --- companies (STIR bo'yicha guruh) ------------------------------------
  const byStir = new Map<string, { names: string[]; phones: string[]; districts: string[] }>();
  for (const r of clean) {
    let e = byStir.get(r.stir);
    if (!e) {
      e = { names: [], phones: [], districts: [] };
      byStir.set(r.stir, e);
    }
    if (r.company) e.names.push(r.company);
    if (r.phone) e.phones.push(r.phone);
    if (r.district) e.districts.push(r.district);
  }

  const companies: CompanyRow[] = [];
  for (const [stir, e] of byStir) {
    const name = mode(e.names) || stir;
    companies.push({
      stir,
      name,
      name_search: normalize(name),
      phone: e.phones.length ? mode(e.phones) : null,
      // 4 ta STIR bir nechta tumanda ishlaydi — eng ko'p uchragani olinadi.
      // Filtrlash baribir vacancies.district bo'yicha boradi.
      district: e.districts.length ? mode(e.districts) : null,
      official_name: null,
      address: null,
      activity_type: null,
      registered_date: null,
      status: null,
      enriched_at: null,
    });
  }

  return {
    companies,
    vacancies,
    report: {
      rowsRead: dataRows.length,
      rowsMerged: vacancies.length,
      duplicatesMerged: clean.length - vacancies.length,
      companies: companies.length,
      districts: new Set(clean.map((r) => r.district)).size,
      salaryNumeric,
      salaryScheduleNote,
      salaryTooHigh,
      salaryTooLow,
      positionsCyrillic,
      positionsLatin,
      skipped: dataRows.length - clean.length,
      errors,
    },
  };
}
