import 'server-only';
import { query, queryOne } from './db';
import { normalize } from './normalize';

/**
 * Barcha SQL shu faylda. Qiymatlar HAR DOIM $1, $2 parametrlari orqali
 * uzatiladi — SQL matniga qo'shib yozilmaydi.
 */

export interface VacancyListItem {
  id: number;
  position: string;
  district: string;
  department: string | null;
  salary: string | null;
  salary_note: string | null;
  education: string | null;
  quota: string | null;
  stavka: string | null;
  posted_date: string | null;
  positions_count: number;
  views: number;
  stir: string;
  company_name: string;
}

export interface VacancyDetail extends VacancyListItem {
  position_search: string;
  company_phone: string | null;
  company_district: string | null;
  import_batch: string;
}

export type SortKey = 'yangi' | 'maosh-kop' | 'maosh-kam' | 'mashhur';

export interface SearchParams {
  q?: string;
  districts?: string[];
  education?: string[];
  stavka?: string[];
  salaryMin?: number;
  salaryMax?: number;
  onlyWithSalary?: boolean;
  onlyQuota?: boolean;
  stir?: string;
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

export interface SearchResult {
  rows: VacancyListItem[];
  total: number;
  page: number;
  perPage: number;
  /** Aniq moslik topilmay, o'xshashlik bo'yicha qidirilgan bo'lsa. */
  fuzzy: boolean;
  /** Sinonim orqali kengaytirilgan so'zlar (foydalanuvchiga ko'rsatiladi). */
  expandedFrom: string | null;
}

const ORDER_BY: Record<SortKey, string> = {
  yangi: 'v.posted_date desc nulls last, v.id desc',
  'maosh-kop': 'v.salary desc nulls last, v.id desc',
  'maosh-kam': 'v.salary asc nulls last, v.id desc',
  mashhur: 'v.views desc, v.positions_count desc, v.id desc',
};

const SELECT_LIST = `
  v.id, v.position, v.district, v.department, v.salary, v.salary_note,
  v.education, v.quota, v.stavka, v.posted_date, v.positions_count, v.views,
  v.stir, c.name as company_name
`;

/** So'rovni sinonimlar bilan kengaytiradi (PLAN §3.2). */
export async function expandQuery(qNorm: string): Promise<{ terms: string[]; expandedFrom: string | null }> {
  if (!qNorm) return { terms: [], expandedFrom: null };

  const rows = await query<{ term: string; canonical: string }>(
    `select term, canonical from synonyms where term = $1 or canonical = $1`,
    [qNorm],
  );
  if (rows.length === 0) return { terms: [qNorm], expandedFrom: null };

  const terms = new Set<string>([qNorm]);
  let expandedFrom: string | null = null;
  for (const r of rows) {
    terms.add(r.term);
    terms.add(r.canonical);
    if (r.term === qNorm) expandedFrom = r.canonical;
  }
  return { terms: [...terms], expandedFrom };
}

/** Filtrlarni SQL shartlariga aylantiradi. */
function buildFilters(p: SearchParams, params: unknown[]): string[] {
  const where: string[] = [];
  const add = (value: unknown) => `$${params.push(value)}`;

  if (p.districts?.length) where.push(`v.district = any(${add(p.districts)}::text[])`);
  if (p.education?.length) where.push(`v.education = any(${add(p.education)}::text[])`);
  if (p.stavka?.length) where.push(`v.stavka = any(${add(p.stavka)}::numeric[])`);
  if (p.salaryMin !== undefined) where.push(`v.salary >= ${add(p.salaryMin)}`);
  if (p.salaryMax !== undefined) where.push(`v.salary <= ${add(p.salaryMax)}`);
  if (p.onlyWithSalary) where.push('v.salary is not null');
  if (p.onlyQuota) where.push('v.quota is not null');
  if (p.stir) where.push(`v.stir = ${add(p.stir)}`);

  return where;
}

export async function searchVacancies(p: SearchParams): Promise<SearchResult> {
  const page = Math.max(1, p.page ?? 1);
  const perPage = Math.min(100, Math.max(1, p.perPage ?? 20));
  const offset = (page - 1) * perPage;
  const sort = p.sort && ORDER_BY[p.sort] ? p.sort : 'yangi';

  const qNorm = normalize(p.q ?? '');
  const { terms, expandedFrom } = await expandQuery(qNorm);

  const run = async (mode: 'exact' | 'fuzzy') => {
    const params: unknown[] = [];
    const where = buildFilters(p, params);

    if (qNorm) {
      if (mode === 'exact') {
        const patterns = terms.map((t) => `%${t}%`);
        const idx = params.push(patterns);
        where.push(`(v.position_search ilike any($${idx}::text[]) or c.name_search ilike any($${idx}::text[]))`);
      } else {
        const idx = params.push(qNorm);
        where.push(`v.position_search % $${idx}`);
      }
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const orderSql =
      mode === 'fuzzy' && qNorm
        ? `similarity(v.position_search, $${params.push(qNorm)}) desc, ${ORDER_BY[sort]}`
        : ORDER_BY[sort];

    const limitIdx = params.push(perPage);
    const offsetIdx = params.push(offset);

    return query<VacancyListItem & { total: string }>(
      `select ${SELECT_LIST}, count(*) over() as total
       from vacancies v
       join companies c on c.stir = v.stir
       ${whereSql}
       order by ${orderSql}
       limit $${limitIdx} offset $${offsetIdx}`,
      params,
    );
  };

  let rows = await run('exact');
  let fuzzy = false;

  // PLAN §3.1 — aniq moslik kam bo'lsa, xato yozilgan so'rov uchun fuzzy fallback
  if (rows.length === 0 && qNorm.length >= 3) {
    rows = await run('fuzzy');
    fuzzy = rows.length > 0;
  }

  const total = rows.length ? Number(rows[0].total) : 0;
  return {
    rows: rows.map(({ total: _t, ...r }) => r),
    total,
    page,
    perPage,
    fuzzy,
    expandedFrom,
  };
}

export async function getVacancy(id: number): Promise<VacancyDetail | null> {
  return queryOne<VacancyDetail>(
    `select ${SELECT_LIST}, v.position_search, v.import_batch,
            c.phone as company_phone, c.district as company_district
     from vacancies v
     join companies c on c.stir = v.stir
     where v.id = $1`,
    [id],
  );
}

/** Ko'rishlar hisoblagichi (PLAN §6 — vakansiya sahifasida views++). */
export async function incrementViews(id: number): Promise<void> {
  await query('update vacancies set views = views + 1 where id = $1', [id]);
}

/** O'xshash vakansiyalar: bir xil kasb yoki bir xil korxona. */
export async function getSimilarVacancies(v: VacancyDetail, limit = 6): Promise<VacancyListItem[]> {
  return query<VacancyListItem>(
    `select ${SELECT_LIST}
     from vacancies v
     join companies c on c.stir = v.stir
     where v.id <> $1
       and (v.position_search % $2 or v.stir = $3)
     order by (v.position_search % $2) desc, similarity(v.position_search, $2) desc, v.id desc
     limit $4`,
    [v.id, v.position_search, v.stir, limit],
  );
}

export interface Totals {
  vacancies: number;
  positions: number;
  companies: number;
  withSalary: number;
  avgSalary: number | null;
}

export async function getTotals(): Promise<Totals> {
  const row = await queryOne<{
    vacancies: string; positions: string; companies: string;
    with_salary: string; avg_salary: string | null;
  }>(
    `select count(*) as vacancies,
            coalesce(sum(positions_count), 0) as positions,
            count(distinct stir) as companies,
            count(*) filter (where salary is not null) as with_salary,
            avg(salary) as avg_salary
     from vacancies`,
  );
  return {
    vacancies: Number(row?.vacancies ?? 0),
    positions: Number(row?.positions ?? 0),
    companies: Number(row?.companies ?? 0),
    withSalary: Number(row?.with_salary ?? 0),
    avgSalary: row?.avg_salary ? Number(row.avg_salary) : null,
  };
}

export interface DistrictCount {
  district: string;
  vacancies: number;
  positions: number;
  avgSalary: number | null;
}

export async function getDistrictCounts(): Promise<DistrictCount[]> {
  const rows = await query<{ district: string; vacancies: string; positions: string; avg_salary: string | null }>(
    `select district, count(*) as vacancies, sum(positions_count) as positions, avg(salary) as avg_salary
     from vacancies group by district order by sum(positions_count) desc`,
  );
  return rows.map((r) => ({
    district: r.district,
    vacancies: Number(r.vacancies),
    positions: Number(r.positions),
    avgSalary: r.avg_salary ? Number(r.avg_salary) : null,
  }));
}

export interface PositionGroup {
  position_search: string;
  label: string;
  vacancies: number;
  positions: number;
}

/**
 * Bosh sahifadagi "top kasblar". `position_search` bo'yicha guruhlanadi,
 * ko'rsatiladigan yozuv sifatida eng ko'p uchragan original olinadi.
 */
export async function getTopPositions(limit = 12): Promise<PositionGroup[]> {
  const rows = await query<{ position_search: string; label: string; vacancies: string; positions: string }>(
    `select position_search,
            mode() within group (order by position) as label,
            count(*) as vacancies,
            sum(positions_count) as positions
     from vacancies
     group by position_search
     order by sum(positions_count) desc
     limit $1`,
    [limit],
  );
  return rows.map((r) => ({
    position_search: r.position_search,
    label: r.label,
    vacancies: Number(r.vacancies),
    positions: Number(r.positions),
  }));
}

/** Autocomplete (PLAN §3.3) — yozayotganda top-6 mos lavozim + soni. */
export async function autocomplete(q: string, limit = 6): Promise<PositionGroup[]> {
  const qNorm = normalize(q);
  if (qNorm.length < 2) return [];

  const { terms } = await expandQuery(qNorm);
  const patterns = terms.map((t) => `%${t}%`);

  const rows = await query<{ position_search: string; label: string; vacancies: string; positions: string }>(
    `select position_search,
            mode() within group (order by position) as label,
            count(*) as vacancies,
            sum(positions_count) as positions
     from vacancies
     where position_search ilike any($1::text[])
     group by position_search
     order by (position_search like $2) desc, sum(positions_count) desc
     limit $3`,
    [patterns, `${qNorm}%`, limit],
  );
  return rows.map((r) => ({
    position_search: r.position_search,
    label: r.label,
    vacancies: Number(r.vacancies),
    positions: Number(r.positions),
  }));
}

/** Har qidiruv yoziladi (PLAN §3.3) — talab analitikasi uchun. */
export async function logSearch(qNorm: string, resultsCount: number): Promise<void> {
  if (!qNorm) return;
  await query('insert into search_logs (query_norm, results_count) values ($1, $2)', [qNorm, resultsCount]);
}

export interface TopSearch {
  query_norm: string;
  hits: number;
  results_count: number;
}

/** Bosh sahifadagi "Ko'p qidirilayotganlar" chiplari. */
export async function getTopSearches(limit = 8, days = 30): Promise<TopSearch[]> {
  const rows = await query<{ query_norm: string; hits: string; results_count: string }>(
    `select query_norm, count(*) as hits, max(results_count) as results_count
     from search_logs
     where created_at > now() - ($2 || ' days')::interval
       and query_norm <> ''
       and results_count > 0
     group by query_norm
     order by count(*) desc
     limit $1`,
    [limit, days],
  );
  return rows.map((r) => ({
    query_norm: r.query_norm,
    hits: Number(r.hits),
    results_count: Number(r.results_count),
  }));
}

export interface CompanyDetail {
  stir: string;
  name: string;
  phone: string | null;
  district: string | null;
  official_name: string | null;
  address: string | null;
  activity_type: string | null;
  registered_date: string | null;
  status: string | null;
  enriched_at: string | null;
  vacancy_count: number;
  positions_count: number;
}

export async function getCompany(stir: string): Promise<CompanyDetail | null> {
  return queryOne<CompanyDetail>(
    `select c.*,
            (select count(*) from vacancies v where v.stir = c.stir) as vacancy_count,
            (select coalesce(sum(positions_count), 0) from vacancies v where v.stir = c.stir) as positions_count
     from companies c where c.stir = $1`,
    [stir],
  );
}

/** SEO sahifalari uchun barcha STIR (sitemap). */
export async function getAllCompanyStirs(): Promise<string[]> {
  const rows = await query<{ stir: string }>('select stir from companies order by stir');
  return rows.map((r) => r.stir);
}

export async function getAllVacancyIds(): Promise<number[]> {
  const rows = await query<{ id: number }>('select id from vacancies order by id');
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// /statistika (PLAN §6)
// ---------------------------------------------------------------------------

export interface StatsBundle {
  totals: Totals;
  districts: DistrictCount[];
  topPositions: PositionGroup[];
  education: { education: string; count: number; positions: number }[];
  salaryBuckets: { bucket: string; from: number; to: number | null; count: number }[];
  topPaying: { label: string; avg_salary: number; count: number }[];
}

const SALARY_BUCKETS: [string, number, number | null][] = [
  ['1 mln gacha', 0, 1_000_000],
  ['1–2 mln', 1_000_000, 2_000_000],
  ['2–3 mln', 2_000_000, 3_000_000],
  ['3–5 mln', 3_000_000, 5_000_000],
  ['5–10 mln', 5_000_000, 10_000_000],
  ['10 mln dan yuqori', 10_000_000, null],
];

export async function getStats(): Promise<StatsBundle> {
  const [totals, districts, topPositions, educationRows, bucketRows, topPayingRows] = await Promise.all([
    getTotals(),
    getDistrictCounts(),
    getTopPositions(10),
    query<{ education: string; count: string; positions: string }>(
      `select coalesce(education, 'Kiritilmagan') as education, count(*) as count, sum(positions_count) as positions
       from vacancies group by education order by count(*) desc`,
    ),
    query<{ idx: string; count: string }>(
      `select width_bucket(salary, array[1000000, 2000000, 3000000, 5000000, 10000000]) as idx, count(*) as count
       from vacancies where salary is not null group by 1 order by 1`,
    ),
    query<{ label: string; avg_salary: string; count: string }>(
      `select mode() within group (order by position) as label,
              avg(salary) as avg_salary, count(*) as count
       from vacancies
       where salary is not null
       group by position_search
       having count(*) >= 5
       order by avg(salary) desc
       limit 10`,
    ),
  ]);

  const bucketCounts = new Map(bucketRows.map((r) => [Number(r.idx), Number(r.count)]));

  return {
    totals,
    districts,
    topPositions,
    education: educationRows.map((r) => ({
      education: r.education,
      count: Number(r.count),
      positions: Number(r.positions),
    })),
    salaryBuckets: SALARY_BUCKETS.map(([bucket, from, to], i) => ({
      bucket,
      from,
      to,
      count: bucketCounts.get(i) ?? 0,
    })),
    topPaying: topPayingRows.map((r) => ({
      label: r.label,
      avg_salary: Number(r.avg_salary),
      count: Number(r.count),
    })),
  };
}

// ---------------------------------------------------------------------------
// Admin (5-bosqich)
// ---------------------------------------------------------------------------

export interface ImportHistoryEntry {
  batch: string;
  rows_read: number | null;
  rows_merged: number | null;
  errors: unknown;
  created_at: string;
}

export async function getImportHistory(limit = 20): Promise<ImportHistoryEntry[]> {
  return query<ImportHistoryEntry>(
    'select batch, rows_read, rows_merged, errors, created_at from import_history order by created_at desc limit $1',
    [limit],
  );
}

export async function getSynonyms(): Promise<{ term: string; canonical: string }[]> {
  return query('select term, canonical from synonyms order by canonical, term');
}

export async function upsertSynonym(term: string, canonical: string): Promise<void> {
  await query(
    'insert into synonyms (term, canonical) values ($1, $2) on conflict (term) do update set canonical = excluded.canonical',
    [normalize(term), normalize(canonical)],
  );
}

export async function deleteSynonym(term: string): Promise<void> {
  await query('delete from synonyms where term = $1', [term]);
}

export interface SearchLogRow {
  query_norm: string;
  hits: number;
  results_count: number;
  last_at: string;
}

export async function getSearchLogSummary(limit = 50): Promise<SearchLogRow[]> {
  const rows = await query<{ query_norm: string; hits: string; results_count: string; last_at: string }>(
    `select query_norm, count(*) as hits, max(results_count) as results_count, max(created_at) as last_at
     from search_logs group by query_norm order by count(*) desc limit $1`,
    [limit],
  );
  return rows.map((r) => ({
    query_norm: r.query_norm,
    hits: Number(r.hits),
    results_count: Number(r.results_count),
    last_at: r.last_at,
  }));
}

/** Sifat hisoboti — admin dashboard uchun. */
export async function getQualityReport() {
  return queryOne<{
    total: string; no_salary: string; unclear: string; no_date: string;
    no_department: string; quota: string; cyrillic: string;
  }>(
    `select count(*) as total,
            count(*) filter (where salary is null) as no_salary,
            count(*) filter (where salary_note = 'Aniqlashtirilmoqda') as unclear,
            count(*) filter (where posted_date is null) as no_date,
            count(*) filter (where department is null) as no_department,
            count(*) filter (where quota is not null) as quota,
            count(*) filter (where position ~ '[Ѐ-ӿ]') as cyrillic
     from vacancies`,
  );
}
