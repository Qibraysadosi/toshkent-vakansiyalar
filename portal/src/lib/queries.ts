import { unstable_cache } from 'next/cache';
import { query, queryOne } from './db';
import { normalize } from './normalize';
import { findSimilar, loose, suggestQuery, type IndexEntry } from './fuzzy';

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
  is_hidden: boolean;
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
  /** Aniq kvota toifalari (bazadagi to'liq matn) */
  quotas?: string[];
  stir?: string;
  /** Admin: yashirilgan yozuvlarni ham ko'rsatish */
  includeHidden?: boolean;
  /**
   * Aniq natija kam bo'lsa (`FEW_RESULTS`), ro'yxat o'xshash yozuvlar bilan
   * to'ldiriladi. Standart — yoqiq; admin qidiruvida o'chiq (aniq yozuv
   * izlanadi). Aniq natija umuman bo'lmasa, o'xshashlari baribir ko'rsatiladi.
   */
  fill?: boolean;
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

export interface SearchRow extends VacancyListItem {
  /** Aniq mos emas — xato yozilgan so'rovga o'xshash deb qo'shilgan (fuzzy.ts → findSimilar). */
  similar: boolean;
}

export interface SearchResult {
  rows: SearchRow[];
  total: number;
  page: number;
  perPage: number;
  /** Aniq moslik topilmay, faqat o'xshashlik bo'yicha topilgan bo'lsa. */
  fuzzy: boolean;
  /** Aniq moslik soni; `total` dan ortig'i o'xshash yozuvlar (ro'yxat oxirida). */
  exactTotal: number;
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
  v.stir, c.name as company_name, v.is_hidden
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
  if (p.quotas?.length) where.push(`v.quota = any(${add(p.quotas)}::text[])`);
  else if (p.onlyQuota) where.push('v.quota is not null');
  if (p.stir) where.push(`v.stir = ${add(p.stir)}`);
  if (!p.includeHidden) where.push('not v.is_hidden');

  return where;
}

/**
 * fuzzy.ts dagi `loose()` ning SQL nusxasi (қ/к → k, ҳ/х → h). Ikkalasi AYNAN
 * bir xil natija berishi shart. `col` — ustun nomi, foydalanuvchi qiymati emas.
 */
const LOOSE = (col: string) => `translate(${col}, 'qx', 'kh')`;

/** Aniq natija shundan kam bo'lsa, ro'yxat o'xshash yozuvlar bilan to'ldiriladi. */
export const FEW_RESULTS = 10;

/** Ro'yxatga qo'shiladigan o'xshash lavozim (kalit) lar soni chegarasi. */
const SIMILAR_LIMIT = 300;

/**
 * Xatoga chidamli qidiruv uchun lavozimlar ro'yxati: kalit, eng ko'p uchragan
 * asl yozuv, vakansiya va ish o'rinlari soni (fuzzy.ts → findSimilar,
 * suggestQuery). Keshda ixcham massiv sifatida saqlanadi (pastda `cached`).
 */
async function getSearchIndexUncached(): Promise<[string, string, number, number][]> {
  const rows = await query<{ ps: string; label: string; n: number; p: number }>(
    `select position_search as ps,
            mode() within group (order by position) as label,
            count(*)::int as n,
            sum(positions_count)::int as p
     from vacancies
     where not is_hidden
     group by position_search`,
  );
  return rows.map((r) => [r.ps, r.label, r.n, r.p]);
}

async function getSearchIndex(): Promise<IndexEntry[]> {
  const rows = await getSearchIndexCached();
  return rows.map(([ps, label, n, p]) => ({ ps, label, n, p }));
}

/**
 * PLAN §3.1 — qidiruv:
 *
 * 1. Aniq moslik: lavozim yoki korxona nomida so'rov (yoki sinonimi) bor.
 *    Lavozim `LOOSE` kalit bo'yicha solishtiriladi — rus klaviaturasi (к/қ,
 *    х/ҳ) natijani bo'lib yubormaydi.
 * 2. Aniq natija `FEW_RESULTS` dan kam bo'lsa — xato yozilgan so'rov uchun
 *    o'xshash lavozimlar (fuzzy.ts → findSimilar: so'zda 1–2 harf xatosi,
 *    qo'sh harf, qo'shimchalar) ro'yxat oxiriga qo'shiladi: avval aniq mos,
 *    keyin xatosi kamlari.
 */
export async function searchVacancies(p: SearchParams): Promise<SearchResult> {
  const requestedPage = Math.max(1, p.page ?? 1);
  const perPage = Math.min(100, Math.max(1, p.perPage ?? 20));
  const sort = p.sort && ORDER_BY[p.sort] ? p.sort : 'yangi';

  const qNorm = normalize(p.q ?? '');
  const { terms, expandedFrom } = await expandQuery(qNorm);

  /** `similar` — o'xshash lavozim kalitlari (tartib = ustuvorlik); berilmasa faqat aniq moslik. */
  const run = async (off: number, similar?: string[]) => {
    const params: unknown[] = [];
    const where = buildFilters(p, params);

    let exactSql = 'true';
    let similarJoin = '';
    let rankCol = '';
    let orderSql = ORDER_BY[sort];
    if (qNorm) {
      const looseIdx = params.push([...new Set(terms.map((t) => `%${loose(t)}%`))]);
      const nameIdx = params.push(terms.map((t) => `%${t}%`));
      exactSql = `(${LOOSE('v.position_search')} like any($${looseIdx}::text[]) or c.name_search ilike any($${nameIdx}::text[]))`;
      if (similar) {
        similarJoin = `left join unnest($${params.push(similar)}::text[]) with ordinality as s(ps, rank) on s.ps = v.position_search`;
        where.push(`(${exactSql} or s.rank is not null)`);
        rankCol = `, case when not ${exactSql} then s.rank end as similar_rank`;
        orderSql = `is_similar, similar_rank, ${ORDER_BY[sort]}`;
      } else {
        where.push(exactSql);
      }
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const limitIdx = params.push(perPage);
    const offsetIdx = params.push(off);

    return query<VacancyListItem & { is_similar: boolean; similar_rank?: number | null; total: string }>(
      `select ${SELECT_LIST}, not ${exactSql} as is_similar${rankCol}, count(*) over() as total
       from vacancies v
       join companies c on c.stir = v.stir
       ${similarJoin}
       ${whereSql}
       order by ${orderSql}
       limit $${limitIdx} offset $${offsetIdx}`,
      params,
    );
  };

  // Sahifa raqami natijalar sonidan oshib ketgan bo'lsa (eski havola, qo'lda
  // yozilgan URL) — oxirgi mavjud sahifaga qisqartiramiz. Aks holda total=0
  // chiqib, o'xshash yozuvlar keraksiz qo'shilar edi.
  const fetchPage = async (similar?: string[]) => {
    let page = requestedPage;
    let rows = await run((page - 1) * perPage, similar);
    if (rows.length === 0 && page > 1) {
      const first = await run(0, similar);
      if (first.length) {
        page = Math.max(1, Math.min(page, Math.ceil(Number(first[0].total) / perPage)));
        rows = page > 1 ? await run((page - 1) * perPage, similar) : first;
      }
    }
    return { rows, page, total: rows.length ? Number(rows[0].total) : 0 };
  };

  let found = await fetchPage();
  const exactTotal = found.total;
  if (qNorm.length >= 3 && exactTotal < FEW_RESULTS && (p.fill !== false || exactTotal === 0)) {
    const similar = findSimilar(qNorm, await getSearchIndex(), SIMILAR_LIMIT).map((e) => e.ps);
    if (similar.length) {
      const withSimilar = await fetchPage(similar);
      if (withSimilar.total > exactTotal) found = withSimilar;
    }
  }

  return {
    // similar_rank faqat tartiblash uchun — tashqariga chiqmaydi
    rows: found.rows.map(({ total: _t, similar_rank: _r, is_similar, ...r }) => ({ ...r, similar: is_similar })),
    total: found.total,
    page: found.page,
    perPage,
    fuzzy: exactTotal === 0 && found.total > 0,
    exactTotal,
    expandedFrom,
  };
}

/**
 * "Balki shuni qidirgandirsiz" taklifi (fuzzy.ts → suggestQuery) — butun
 * lavozimlar ro'yxati bo'yicha, filtrlarsiz (gap yozilishda, tanlovda emas).
 * Sahifa faqat aniq natija kam bo'lganda chaqiradi.
 */
export async function getSpellingSuggestion(qRaw: string): Promise<string | null> {
  if (normalize(qRaw).length < 3) return null;
  return suggestQuery(qRaw, await getSearchIndex());
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
     where v.id <> $1 and not v.is_hidden
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

async function getTotalsUncached(): Promise<Totals> {
  const row = await queryOne<{
    vacancies: string; positions: string; companies: string;
    with_salary: string; avg_salary: string | null;
  }>(
    `select count(*) as vacancies,
            coalesce(sum(positions_count), 0) as positions,
            count(distinct stir) as companies,
            count(*) filter (where salary is not null) as with_salary,
            avg(salary) as avg_salary
     from vacancies where not is_hidden`,
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

async function getDistrictCountsUncached(): Promise<DistrictCount[]> {
  const rows = await query<{ district: string; vacancies: string; positions: string; avg_salary: string | null }>(
    `select district, count(*) as vacancies, sum(positions_count) as positions, avg(salary) as avg_salary
     from vacancies where not is_hidden group by district order by sum(positions_count) desc`,
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
async function getTopPositionsUncached(limit = 12): Promise<PositionGroup[]> {
  const rows = await query<{ position_search: string; label: string; vacancies: string; positions: string }>(
    `select position_search,
            mode() within group (order by position) as label,
            count(*) as vacancies,
            sum(positions_count) as positions
     from vacancies
     where not is_hidden
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

/**
 * Autocomplete (PLAN §3.3) — yozayotganda top-6 mos lavozim + soni. Qidiruv
 * kabi `LOOSE` kalit bo'yicha; kam topilsa — o'xshash lavozimlar bilan to'ldiriladi.
 */
export async function autocomplete(q: string, limit = 6): Promise<PositionGroup[]> {
  const qNorm = normalize(q);
  if (qNorm.length < 2) return [];

  const { terms } = await expandQuery(qNorm);
  const patterns = [...new Set(terms.map((t) => `%${loose(t)}%`))];

  const rows = await query<{ position_search: string; label: string; vacancies: string; positions: string }>(
    `select position_search,
            mode() within group (order by position) as label,
            count(*) as vacancies,
            sum(positions_count) as positions
     from vacancies
     where ${LOOSE('position_search')} like any($1::text[]) and not is_hidden
     group by position_search
     order by (${LOOSE('position_search')} like $2) desc, sum(positions_count) desc
     limit $3`,
    [patterns, `${loose(qNorm)}%`, limit],
  );
  const items: PositionGroup[] = rows.map((r) => ({
    position_search: r.position_search,
    label: r.label,
    vacancies: Number(r.vacancies),
    positions: Number(r.positions),
  }));

  // Aniq mos kam bo'lsa — xato yozilgan so'rovga o'xshash lavozimlar bilan to'ldiriladi
  if (items.length < limit && qNorm.length >= 3) {
    const seen = new Set(items.map((i) => i.position_search));
    for (const e of findSimilar(qNorm, await getSearchIndex(), limit + items.length)) {
      if (items.length >= limit) break;
      if (!seen.has(e.ps)) items.push({ position_search: e.ps, label: e.label, vacancies: e.n, positions: e.p });
    }
  }
  return items;
}

/**
 * Qidiruv analitikasi (PLAN §3.3). `qRaw` — foydalanuvchi yozgan asl matn
 * (chiplarda ko'rsatish uchun, apostroflari bilan), `qNorm` — qidiruv kaliti.
 * Chaqiruvchi tomon faqat 1-sahifa va standart saralashda yozadi (robotlar,
 * varaqlash va saralash loglarni to'ldirmasin).
 */
export async function logSearch(qRaw: string, qNorm: string, resultsCount: number): Promise<void> {
  if (!qNorm) return;
  await query('insert into search_logs (query, query_norm, results_count) values ($1, $2, $3)', [
    qRaw.trim().slice(0, 100),
    qNorm.slice(0, 200),
    resultsCount,
  ]);
  // Saqlash muddati: 180 kundan eski loglar vaqti-vaqti bilan (taxminan har
  // 100-yozuvda) tozalanadi — jadval cheksiz o'smaydi, alohida cron shart emas.
  if (Math.random() < 0.01) {
    await query("delete from search_logs where created_at < now() - interval '180 days'").catch(() => {});
  }
}

export interface TopSearch {
  query_norm: string;
  /** Ko'rsatish matni — foydalanuvchilar eng ko'p yozgan ko'rinish (masalan, "o'qituvchi"). */
  label: string;
  hits: number;
  results_count: number;
}

/** Bosh sahifadagi "Ko'p qidirilayotganlar" chiplari. */
async function getTopSearchesUncached(limit = 8, days = 30): Promise<TopSearch[]> {
  const rows = await query<{ query_norm: string; label: string; hits: string; results_count: string }>(
    `select query_norm,
            coalesce(mode() within group (order by query), query_norm) as label,
            count(*) as hits, max(results_count) as results_count
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
    label: r.label || r.query_norm,
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
            (select count(*) from vacancies v where v.stir = c.stir and not v.is_hidden) as vacancy_count,
            (select coalesce(sum(v.positions_count), 0) from vacancies v where v.stir = c.stir and not v.is_hidden)
              as positions_count
     from companies c where c.stir = $1`,
    [stir],
  );
}

/** SEO sahifalari uchun barcha STIR (sitemap). */
export async function getAllCompanyStirs(): Promise<string[]> {
  // Sitemap: faqat ko'rinadigan vakansiyasi bor korxonalar (bo'sh sahifa e'lon qilinmasin)
  const rows = await query<{ stir: string }>('select distinct stir from vacancies where not is_hidden order by stir');
  return rows.map((r) => r.stir);
}

export async function getAllVacancyIds(): Promise<number[]> {
  const rows = await query<{ id: number }>('select id from vacancies where not is_hidden order by id');
  return rows.map((r) => r.id);
}

/** Saqlangan ro'yxat uchun — id bo'yicha (tartib saqlanadi). */
export async function getVacanciesByIds(ids: number[]): Promise<VacancyListItem[]> {
  const clean = [...new Set(ids.filter((n) => Number.isSafeInteger(n) && n > 0))].slice(0, 100);
  if (clean.length === 0) return [];
  const rows = await query<VacancyListItem>(
    `select ${SELECT_LIST}
     from vacancies v join companies c on c.stir = v.stir
     where v.id = any($1::bigint[]) and not v.is_hidden`,
    [clean],
  );
  const order = new Map(clean.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** "Yangi" nishoni uchun: bazadagi eng so'nggi e'lon sanasi. */
async function getLatestPostedDateUncached(): Promise<string | null> {
  const row = await queryOne<{ latest: string | null }>(
    'select max(posted_date) as latest from vacancies where not is_hidden',
  );
  return row?.latest ?? null;
}

export interface QuotaCount {
  quota: string;
  count: number;
}

async function getQuotaCountsUncached(): Promise<QuotaCount[]> {
  const rows = await query<{ quota: string; count: string }>(
    `select quota, count(*) as count from vacancies
     where quota is not null and not is_hidden group by quota order by count(*) desc`,
  );
  return rows.map((r) => ({ quota: r.quota, count: Number(r.count) }));
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

async function getStatsUncached(): Promise<StatsBundle> {
  const [totals, districts, topPositions, educationRows, bucketRows, topPayingRows] = await Promise.all([
    getTotals(),
    getDistrictCounts(),
    getTopPositions(10),
    query<{ education: string; count: string; positions: string }>(
      `select coalesce(education, 'Kiritilmagan') as education, count(*) as count, sum(positions_count) as positions
       from vacancies where not is_hidden group by education order by count(*) desc`,
    ),
    query<{ idx: string; count: string }>(
      `select width_bucket(salary, array[1000000, 2000000, 3000000, 5000000, 10000000]) as idx, count(*) as count
       from vacancies where salary is not null and not is_hidden group by 1 order by 1`,
    ),
    query<{ label: string; avg_salary: string; count: string }>(
      `select mode() within group (order by position) as label,
              avg(salary) as avg_salary, count(*) as count
       from vacancies
       where salary is not null and not is_hidden
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

export async function getSearchLogSummary(limit = 50, days = 90): Promise<SearchLogRow[]> {
  const rows = await query<{ query_norm: string; hits: string; results_count: string; last_at: string }>(
    `select query_norm, count(*) as hits, max(results_count) as results_count, max(created_at) as last_at
     from search_logs
     where created_at > now() - ($2 || ' days')::interval
     group by query_norm order by count(*) desc limit $1`,
    [limit, days],
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

// ---------------------------------------------------------------------------
// Admin: vakansiyani yashirish / ochish
// ---------------------------------------------------------------------------

export async function setVacancyHidden(id: number, hidden: boolean): Promise<void> {
  await query('update vacancies set is_hidden = $2 where id = $1', [id, hidden]);
}

export async function getHiddenVacancies(limit = 100): Promise<VacancyListItem[]> {
  return query<VacancyListItem>(
    `select ${SELECT_LIST} from vacancies v join companies c on c.stir = v.stir
     where v.is_hidden order by v.id desc limit $1`,
    [limit],
  );
}

// ---------------------------------------------------------------------------
// Telegram obunalari (PLAN §9)
// ---------------------------------------------------------------------------

export interface Subscription {
  id: number;
  tg_chat_id: number;
  username: string | null;
  query_norm: string | null;
  /** Foydalanuvchi yozgan asl kasb matni (ko'rsatish uchun; moslashtirish query_norm bo'yicha) */
  query_text: string | null;
  district: string | null;
  is_active: boolean;
  notified_at: string | null;
  /** Oxirgi ko'rib chiqilgan import batch (xabar yuborilgan yoki mos vakansiya topilmagan) */
  last_batch: string | null;
  created_at: string;
}

/** Bitta chat — bitta obuna. Qayta /start qilsa yangilanadi. */
export async function upsertSubscription(
  chatId: number,
  username: string | null,
  queryNorm: string | null,
  district: string | null,
  queryText: string | null = null,
): Promise<void> {
  await query(
    `insert into subscriptions (tg_chat_id, username, query_norm, query_text, district, is_active)
     values ($1, $2, $3, $4, $5, true)
     on conflict (tg_chat_id) do update set
       username = excluded.username, query_norm = excluded.query_norm, query_text = excluded.query_text,
       district = excluded.district, is_active = true`,
    [chatId, username, queryNorm, queryText, district],
  );
}

export async function getSubscription(chatId: number): Promise<Subscription | null> {
  return queryOne<Subscription>('select * from subscriptions where tg_chat_id = $1', [chatId]);
}

export async function deactivateSubscription(chatId: number): Promise<void> {
  await query('update subscriptions set is_active = false where tg_chat_id = $1', [chatId]);
}

export async function listSubscriptions(limit = 200): Promise<Subscription[]> {
  return query<Subscription>('select * from subscriptions order by created_at desc limit $1', [limit]);
}

/**
 * Bildirishnoma navbati: faol, kasb yoki tuman tanlagan va SHU batch uchun hali
 * ko'rib chiqilmagan obunachilar (`last_batch` boshqa). Shu tufayli yuborish
 * uzilib qolsa (Vercel vaqt chegarasi) yoki tugma qayta bosilsa, davom etadi —
 * hech kimga ikki marta bormaydi. Eng eski obuna birinchi.
 */
export async function listPendingSubscriptions(batch: string, limit = 5000): Promise<Subscription[]> {
  return query<Subscription>(
    `select * from subscriptions
     where is_active and (query_norm is not null or district is not null)
       and last_batch is distinct from $1
     order by created_at asc, id asc limit $2`,
    [batch, limit],
  );
}

export async function getSubscriptionStats(): Promise<{ total: number; active: number; notified: number }> {
  const row = await queryOne<{ total: string; active: string; notified: string }>(
    `select count(*) as total,
            count(*) filter (where is_active) as active,
            count(*) filter (where notified_at is not null) as notified
     from subscriptions`,
  );
  return { total: Number(row?.total ?? 0), active: Number(row?.active ?? 0), notified: Number(row?.notified ?? 0) };
}

/**
 * Importdan keyin obunachiga mos YANGI vakansiyalar — faqat shu batchda birinchi
 * marta paydo bo'lganlar (`first_batch`). `import_batch` upsertda har oy
 * yangilanadi, shuning uchun unga qarab bo'lmaydi: o'tgan oydan qolganlar ham
 * "yangi" bo'lib qayta ketardi.
 */
export async function matchesForSubscription(sub: Subscription, batch: string, limit = 5): Promise<VacancyListItem[]> {
  const params: unknown[] = [batch];
  const where = ['v.first_batch = $1', 'not v.is_hidden'];
  if (sub.query_norm) {
    const { terms } = await expandQuery(sub.query_norm);
    params.push([...new Set(terms.map((t) => `%${loose(t)}%`))]);
    where.push(`${LOOSE('v.position_search')} like any($${params.length}::text[])`);
  }
  if (sub.district) {
    params.push(sub.district);
    where.push(`v.district = $${params.length}`);
  }
  params.push(limit);
  return query<VacancyListItem>(
    `select ${SELECT_LIST} from vacancies v join companies c on c.stir = v.stir
     where ${where.join(' and ')}
     order by v.salary desc nulls last, v.id desc limit $${params.length}`,
    params,
  );
}

/** Xabar yuborildi: `notified_at` yangilanadi, batch berilsa `last_batch` ham. */
export async function markNotified(chatId: number, batch?: string): Promise<void> {
  await query(
    'update subscriptions set notified_at = now(), last_batch = coalesce($2, last_batch) where tg_chat_id = $1',
    [chatId, batch ?? null],
  );
}

/** Shu batch uchun ko'rib chiqildi (mos vakansiya yo'q yoki yuborib bo'lmadi) — qayta urinilmaydi. */
export async function markChecked(chatId: number, batch: string): Promise<void> {
  await query('update subscriptions set last_batch = $2 where tg_chat_id = $1', [chatId, batch]);
}

/** Bot ichidagi oddiy qidiruv — sayt bilan bitta normalize()/sinonim mantiqi. */
export async function botSearch(q: string, district: string | null, limit = 5): Promise<{ rows: VacancyListItem[]; total: number }> {
  const result = await searchVacancies({
    q,
    districts: district ? [district] : undefined,
    perPage: limit,
    sort: 'maosh-kop',
  });
  return { rows: result.rows, total: result.total };
}

/** Oxirgi import batch nomi (bildirishnoma skripti uchun). */
export async function getLatestBatch(): Promise<string | null> {
  const row = await queryOne<{ batch: string }>('select batch from import_history order by created_at desc limit 1');
  return row?.batch ?? null;
}

// ---------------------------------------------------------------------------
// Kesh — og'ir ommaviy o'qishlar
// ---------------------------------------------------------------------------

/**
 * Layout cookie o'qigani (alifbo/mavzu) uchun sahifa darajasidagi ISR ishlamaydi;
 * shuning uchun kesh SO'ROV darajasida: quyidagi o'qishlar Next Data Cache'da
 * 10 daqiqa saqlanadi (Vercel'da har so'rovda Supabase'ga borilmaydi). Admin
 * import/yashirish/"Keshni tozalash" `revalidateTag(CACHE_TAG)` bilan darhol
 * tozalaydi; skript orqali import qilinsa eng ko'pi bilan 10 daqiqa eskiradi. Bu funksiyalarni
 * tsx skriptlardan chaqirmang (Next keshi yo'q — xato beradi).
 */
export const CACHE_TAG = 'vacancies';
/** Skript orqali import (revalidateTag chaqirilmaydi) eng ko'pi bilan shuncha eskiradi. */
export const CACHE_SECONDS = 600;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cached<T extends (...args: any[]) => Promise<any>>(fn: T, key: string): T {
  return unstable_cache(fn, ['vakansiyalar', key], { revalidate: CACHE_SECONDS, tags: [CACHE_TAG] }) as T;
}

export const getTotals = cached(getTotalsUncached, 'getTotals');
export const getDistrictCounts = cached(getDistrictCountsUncached, 'getDistrictCounts');
export const getTopPositions = cached(getTopPositionsUncached, 'getTopPositions');
export const getTopSearches = cached(getTopSearchesUncached, 'getTopSearches');
export const getLatestPostedDate = cached(getLatestPostedDateUncached, 'getLatestPostedDate');
export const getQuotaCounts = cached(getQuotaCountsUncached, 'getQuotaCounts');
export const getStats = cached(getStatsUncached, 'getStats');
const getSearchIndexCached = cached(getSearchIndexUncached, 'getSearchIndex');
