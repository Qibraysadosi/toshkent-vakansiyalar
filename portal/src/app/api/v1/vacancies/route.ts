import { NextResponse } from 'next/server';
import { getVacanciesByIds, searchVacancies } from '@/lib/queries';
import { parseSearchParams } from '@/lib/search-params';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * PLAN §10 — hujjatlashtirilgan ochiq JSON endpoint (kelajakdagi mobil ilova
 * uchun tayyor eshik).
 *
 *   GET /api/v1/vacancies?q=qorovul&tuman=chilonzor&limit=20&sahifa=2
 *
 * Parametrlar sayt URL'i bilan bir xil: q, tuman, talim, stavka, maosh,
 * maoshli, kvota, saralash, sahifa. Qo'shimcha: limit (1..100),
 * ids=1,2,3 (aniq yozuvlar — saqlanganlar ro'yxati uchun).
 */
export async function GET(request: Request) {
  const limited = rateLimit(request, { key: 'api-v1', limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(request.url);

  const idsRaw = url.searchParams.get('ids');
  let result;
  if (idsRaw) {
    const ids = idsRaw.split(',').map(Number).filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 100);
    const rows = await getVacanciesByIds(ids);
    result = { rows, total: rows.length, page: 1, perPage: rows.length || 1, fuzzy: false };
  } else {
    const parsed = parseSearchParams(url.searchParams);
    const limitRaw = url.searchParams.get('limit');
    const perPage = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(100, Math.max(1, Number(limitRaw))) : 20;
    result = await searchVacancies({ ...parsed, perPage });
  }

  return NextResponse.json(
    {
      meta: {
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        pages: Math.ceil(result.total / result.perPage),
        fuzzy: result.fuzzy,
      },
      data: result.rows.map((v) => ({
        id: v.id,
        position: v.position,
        district: v.district,
        department: v.department,
        company: { stir: v.stir, name: v.company_name },
        salary: v.salary === null ? null : Number(v.salary),
        salary_note: v.salary_note,
        stavka: v.stavka === null ? null : Number(v.stavka),
        education: v.education,
        quota: v.quota,
        positions_count: v.positions_count,
        posted_date: v.posted_date,
        url: `/vakansiya/${v.id}`,
      })),
    },
    {
      headers: {
        'cache-control': 'public, max-age=300, stale-while-revalidate=3600',
        'access-control-allow-origin': '*',
      },
    },
  );
}
