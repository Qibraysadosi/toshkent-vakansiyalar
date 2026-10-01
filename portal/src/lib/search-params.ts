import { DISTRICTS, districtBySlug, districtByDbName } from './districts';
import { EDUCATION_LEVELS } from './format';
import { QUOTAS, quotaBySlug } from './quotas';
import type { SearchParams, SortKey } from './queries';

/**
 * URL query ↔ qidiruv parametrlari. Hamma filtr URL'da turadi, shuning uchun
 * natijani ulashsa bo'ladi (PLAN §6).
 *
 * Kalitlar o'zbekcha: ?q=qorovul&tuman=chilonzor&talim=oliy&maoshli=1
 */

export const PARAM = {
  q: 'q',
  district: 'tuman',
  education: 'talim',
  stavka: 'stavka',
  salaryMin: 'maosh',
  onlyWithSalary: 'maoshli',
  onlyQuota: 'kvota',
  sort: 'saralash',
  page: 'sahifa',
} as const;

export const SORT_OPTIONS: { value: SortKey; lat: string; cyr: string }[] = [
  { value: 'yangi', lat: 'Eng yangi', cyr: 'Энг янги' },
  { value: 'maosh-kop', lat: "Maosh: ko'pdan", cyr: 'Маош: кўпдан' },
  { value: 'maosh-kam', lat: 'Maosh: kamdan', cyr: 'Маош: камдан' },
  { value: 'mashhur', lat: 'Mashhur', cyr: 'Машҳур' },
];

const EDUCATION_SLUGS: Record<string, string> = {
  oliy: 'Олий',
  'orta-maxsus': 'Ўрта-махсус',
  'talab-etilmaydi': 'Талаб этилмайди',
};
const EDUCATION_TO_SLUG = new Map(Object.entries(EDUCATION_SLUGS).map(([k, v]) => [v, k]));

export function educationSlug(db: string): string {
  return EDUCATION_TO_SLUG.get(db) ?? db;
}

/** Maosh parametri — faqat butun son. parseSearchParams va activeChips bir xil tekshiradi. */
const SALARY_RE = /^\d+$/;

/** Qidiruv so'rovining maksimal uzunligi (autocomplete bilan bir xil). */
const MAX_QUERY_LENGTH = 100;

function all(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean);
}

/** URL query → `searchVacancies()` parametrlari. Yaroqsiz qiymatlar tashlanadi. */
export function parseSearchParams(params: URLSearchParams): SearchParams & { hasFilters: boolean } {
  const districts = all(params, PARAM.district)
    .map((slug) => districtBySlug(slug)?.db)
    .filter((v): v is string => Boolean(v));

  const education = all(params, PARAM.education)
    .map((slug) => EDUCATION_SLUGS[slug])
    .filter(Boolean);

  const stavka = all(params, PARAM.stavka).filter((s) => /^\d+(\.\d+)?$/.test(s));

  const salaryRaw = params.get(PARAM.salaryMin);
  const salaryMin = salaryRaw && SALARY_RE.test(salaryRaw) ? Number(salaryRaw) : undefined;

  const onlyWithSalary = params.get(PARAM.onlyWithSalary) === '1';

  // kvota=1 → istalgan kvota; kvota=nogironlik,pensiya-oldi → aniq toifalar
  const quotaRaw = all(params, PARAM.onlyQuota);
  const onlyQuota = quotaRaw.includes('1');
  const quotas = quotaRaw
    .map((slug) => quotaBySlug(slug)?.db)
    .filter((v): v is string => Boolean(v));

  const sortRaw = params.get(PARAM.sort);
  const sort = SORT_OPTIONS.some((o) => o.value === sortRaw) ? (sortRaw as SortKey) : 'yangi';

  const pageRaw = params.get(PARAM.page);
  const page = pageRaw && /^\d+$/.test(pageRaw) ? Math.max(1, Number(pageRaw)) : 1;

  const q = (params.get(PARAM.q) ?? '').trim().slice(0, MAX_QUERY_LENGTH);

  return {
    q: q || undefined,
    districts: districts.length ? districts : undefined,
    education: education.length ? education : undefined,
    stavka: stavka.length ? stavka : undefined,
    // salaryMin qo'yilsa, maoshsizlar baribir chiqmaydi
    salaryMin,
    onlyWithSalary: onlyWithSalary || salaryMin !== undefined,
    onlyQuota: onlyQuota && quotas.length === 0,
    quotas: quotas.length ? quotas : undefined,
    sort,
    page,
    hasFilters: Boolean(
      q || districts.length || education.length || stavka.length || salaryMin || onlyWithSalary ||
        onlyQuota || quotas.length,
    ),
  };
}

export interface ActiveChip {
  key: string;
  value: string;
  label: string;
}

/** Ro'yxat tepasidagi faol filtr chiplari (✕ bilan olib tashlanadi). */
export function activeChips(params: URLSearchParams, script: 'lat' | 'cyr'): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const cyr = script === 'cyr';

  for (const slug of all(params, PARAM.district)) {
    const d = districtBySlug(slug);
    if (d) chips.push({ key: PARAM.district, value: slug, label: cyr ? d.cyr : d.lat });
  }
  for (const slug of all(params, PARAM.education)) {
    const db = EDUCATION_SLUGS[slug];
    const level = EDUCATION_LEVELS.find((e) => e.db === db);
    if (level) chips.push({ key: PARAM.education, value: slug, label: cyr ? level.cyr : level.lat });
  }
  for (const s of all(params, PARAM.stavka)) {
    chips.push({ key: PARAM.stavka, value: s, label: `${s.replace('.', ',')} ${cyr ? 'ставка' : 'stavka'}` });
  }
  const salary = params.get(PARAM.salaryMin);
  if (salary && SALARY_RE.test(salary)) {
    const mln = Number(salary) / 1_000_000;
    chips.push({
      key: PARAM.salaryMin,
      value: salary,
      label: `${mln} ${cyr ? 'млн дан юқори' : 'mln dan yuqori'}`,
    });
  }
  if (params.get(PARAM.onlyWithSalary) === '1') {
    chips.push({
      key: PARAM.onlyWithSalary,
      value: '1',
      label: cyr ? 'Маоши кўрсатилган' : "Maoshi ko'rsatilgan",
    });
  }
  for (const raw of all(params, PARAM.onlyQuota)) {
    if (raw === '1') {
      chips.push({ key: PARAM.onlyQuota, value: '1', label: cyr ? 'Квота' : 'Kvota' });
      continue;
    }
    const q = quotaBySlug(raw);
    if (q) chips.push({ key: PARAM.onlyQuota, value: raw, label: cyr ? q.cyr : q.lat });
  }
  return chips;
}

/** Tuman nomidan slug (kartadagi havolalar uchun). */
export function districtSlug(dbName: string): string | undefined {
  return districtByDbName(dbName)?.slug;
}

export const ALL_DISTRICTS = DISTRICTS;
export const ALL_QUOTAS = QUOTAS;
export { EDUCATION_SLUGS };
