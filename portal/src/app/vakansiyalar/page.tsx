import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { Suspense } from 'react';
import { getDistrictCounts, getLatestPostedDate, getQuotaCounts, logSearch, searchVacancies } from '@/lib/queries';
import { getScript } from '@/lib/script';
import { normalize } from '@/lib/normalize';
import { transliterate } from '@/lib/transliterate';
import { formatNumber } from '@/lib/format';
import { PARAM, SORT_OPTIONS, parseSearchParams } from '@/lib/search-params';
import { SearchBox } from '@/components/SearchBox';
import { VacancyCard } from '@/components/VacancyCard';
import { ActiveFilterChips, FilterPanel } from '@/components/FilterPanel';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

export async function generateMetadata({ searchParams }: { searchParams: SearchParamsInput }): Promise<Metadata> {
  const raw = await searchParams;
  const hasParams = Object.keys(raw).length > 0;
  return {
    title: 'Vakansiyalar',
    description: "Toshkentdagi bo'sh ish o'rinlari: tuman, ta'lim, maosh va stavka bo'yicha filtrlash.",
    alternates: { canonical: '/vakansiyalar' },
    // Filtr/qidiruv kombinatsiyalari (?q=, ?sahifa=, ?saralash=) indekslanmasin —
    // robotlar cheksiz variantlarni aylanib chiqmaydi, faqat asosiy sahifa qoladi.
    robots: hasParams ? { index: false, follow: true } : undefined,
  };
}

const PER_PAGE = 20;

/** Qidiruv loglariga yozilmaydigan mijozlar (bosh sahifadagi chiplarni aylanib chiqadiganlar). */
const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|telegram/i;

const TEXT = {
  lat: {
    title: 'Vakansiyalar',
    found: 'ta natija',
    forQuery: "so'rov bo'yicha",
    sort: 'Saralash',
    fuzzy: "Aniq moslik topilmadi — o'xshash yozuvlar ko'rsatilmoqda.",
    synonym: 'Sinonim bo’yicha ham qidirildi:',
  },
  cyr: {
    title: 'Вакансиялар',
    found: 'та натижа',
    forQuery: 'сўров бўйича',
    sort: 'Саралаш',
    fuzzy: 'Аниқ мослик топилмади — ўхшаш ёзувлар кўрсатилмоқда.',
    synonym: 'Синоним бўйича ҳам қидирилди:',
  },
} as const;

type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;

function toURLSearchParams(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const v of value) out.append(key, v);
    else out.append(key, value);
  }
  return out;
}

export default async function VacanciesPage({ searchParams }: { searchParams: SearchParamsInput }) {
  const script = await getScript();
  const t = TEXT[script];

  const raw = await searchParams;
  const params = toURLSearchParams(raw);
  const parsed = parseSearchParams(params);

  const [result, districts, quotas, newSince] = await Promise.all([
    searchVacancies({ ...parsed, perPage: PER_PAGE }),
    getDistrictCounts(),
    getQuotaCounts(),
    getLatestPostedDate(),
  ]);
  const quotaCounts = Object.fromEntries(quotas.map((q) => [q.quota, q.count]));

  // PLAN §3.3 — qidiruv analitikasi. Faqat 1-sahifa va standart saralash
  // yoziladi (varaqlash va saralash bitta so'rov), robotlar yozilmaydi; yozuv
  // javob yuborilgandan keyin (`after`) ketadi — render kutib turmaydi.
  if (parsed.q && parsed.page === 1 && !params.get(PARAM.sort)) {
    const ua = (await headers()).get('user-agent') ?? '';
    if (!BOT_UA.test(ua)) {
      const q = parsed.q;
      const total = result.total;
      after(() => logSearch(q, normalize(q), total).catch(() => {}));
    }
  }

  const districtCounts = Object.fromEntries(districts.map((d) => [d.district, d.positions]));

  const sortParams = (value: string) => {
    const next = new URLSearchParams(params);
    next.set(PARAM.sort, value);
    next.delete(PARAM.page);
    return `/vakansiyalar?${next.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-xl font-600">{t.title}</h1>
        <div className="mt-4">
          <Suspense fallback={<div className="skeleton h-12 rounded-karta" />}>
            <SearchBox script={script} defaultValue={parsed.q ?? ''} size="kichik" />
          </Suspense>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <Suspense fallback={null}>
          <FilterPanel script={script} districtCounts={districtCounts} quotaCounts={quotaCounts} />
        </Suspense>

        <div className="min-w-0">
          <Suspense fallback={null}>
            <ActiveFilterChips script={script} />
          </Suspense>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            {/* Filtr o'zgarganda natija soni ekran o'qigichga e'lon qilinadi */}
            <p className="text-sm text-tosh" role="status" aria-live="polite" aria-atomic="true">
              <span className="raqam text-matn">{formatNumber(result.total)}</span> {t.found}
              {parsed.q && (
                <>
                  {' '}
                  <span className="text-tosh">
                    «{transliterate(parsed.q, script)}» {t.forQuery}
                  </span>
                </>
              )}
            </p>

            {/* Desktop saralash (mobilda FilterPanel ichida) */}
            <div className="bosmada-yashir hidden items-center gap-1.5 lg:flex">
              <span className="text-xs text-tosh">{t.sort}:</span>
              {SORT_OPTIONS.map((o) => {
                const on = (parsed.sort ?? 'yangi') === o.value;
                return (
                  <Link
                    key={o.value}
                    href={sortParams(o.value)}
                    scroll={false}
                    aria-current={on ? 'true' : undefined}
                    className={
                      on
                        ? 'rounded-full bg-chinni px-3 py-1 text-xs text-chinni-ustida'
                        : 'rounded-full px-3 py-1 text-xs text-tosh transition-colors hover:text-chinni'
                    }
                  >
                    {script === 'cyr' ? o.cyr : o.lat}
                  </Link>
                );
              })}
            </div>
          </div>

          {result.fuzzy && (
            <p className="mb-4 rounded-karta border border-quyosh/40 bg-quyosh/10 px-4 py-2.5 text-xs text-quyosh-matn">
              {t.fuzzy}
            </p>
          )}
          {result.expandedFrom && !result.fuzzy && (
            <p className="mb-4 text-xs text-tosh">
              {t.synonym} <span className="text-chinni">{transliterate(result.expandedFrom, script)}</span>
            </p>
          )}

          {result.rows.length === 0 ? (
            <EmptyState script={script} hasFilters={parsed.hasFilters} />
          ) : (
            <ul className="stagger grid gap-3">
              {result.rows.map((v) => (
                <li key={v.id}>
                  <VacancyCard v={v} script={script} newSince={newSince} />
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={result.page}
            perPage={result.perPage}
            total={result.total}
            params={params}
            script={script}
          />
        </div>
      </div>
    </div>
  );
}
