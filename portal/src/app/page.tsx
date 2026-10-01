import Link from 'next/link';
import { getDistrictCounts, getTopPositions, getTopSearches, getTotals } from '@/lib/queries';
import { getScript } from '@/lib/script';
import { transliterate } from '@/lib/transliterate';
import { formatNumber } from '@/lib/format';
import { CountUp } from '@/components/CountUp';
import { DistrictMap } from '@/components/DistrictMap';
import { SearchBox } from '@/components/SearchBox';
import { RecentlyViewed } from '@/components/RecentlyViewed';

/*
 * Layout cookie o'qiydi (alifbo/mavzu) — butun marshrut har so'rovda render
 * qilinadi, shuning uchun `revalidate` bu yerda hech qachon ishlamas edi
 * (PLAN §10 ISR va'dasi so'rovlar keshi orqali hal qilinishi kerak). Oshkora dinamik.
 */
export const dynamic = 'force-dynamic';

const TEXT = {
  lat: {
    h1a: 'Toshkentda',
    h1b: 'ish topish',
    lead: "Rasmiy bazadagi barcha bo'sh o'rinlar bir joyda. Kirill yoki lotin — farqi yo'q, baribir topiladi.",
    counter: "ta ish o'rni ichidan qidirilmoqda",
    districts: 'Tumanlar bo’yicha',
    districtsLead: "Tumanni tanlang — o'sha yerdagi barcha vakansiyalar ochiladi.",
    popular: 'Ko’p qidirilayotganlar',
    topJobs: 'Eng ko’p talab qilinadigan kasblar',
    seeAll: 'Barchasi',
    places: "ta o'rin",
    companies: 'korxona',
    avg: "o'rtacha maosh",
    withSalary: 'maoshi ko’rsatilgan',
  },
  cyr: {
    h1a: 'Тошкентда',
    h1b: 'иш топиш',
    lead: 'Расмий базадаги барча бўш ўринлар бир жойда. Кирилл ёки лотин — фарқи йўқ, барибир топилади.',
    counter: 'та иш ўрни ичидан қидирилмоқда',
    districts: 'Туманлар бўйича',
    districtsLead: 'Туманни танланг — ўша ердаги барча вакансиялар очилади.',
    popular: 'Кўп қидирилаётганлар',
    topJobs: 'Энг кўп талаб қилинадиган касблар',
    seeAll: 'Барчаси',
    places: 'та ўрин',
    companies: 'корхона',
    avg: 'ўртача маош',
    withSalary: 'маоши кўрсатилган',
  },
} as const;

export default async function HomePage() {
  const script = await getScript();
  const t = TEXT[script];

  const [totals, districts, topPositions, topSearches] = await Promise.all([
    getTotals(),
    getDistrictCounts(),
    getTopPositions(12),
    getTopSearches(8),
  ]);

  const counts = Object.fromEntries(districts.map((d) => [d.district, d.positions]));

  return (
    <>
      {/* --- Hero -------------------------------------------------------- */}
      <section className="relative">
        <div aria-hidden className="koshin-fon pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-20">
        <h1 className="hero-sarlavha font-display font-700">
          {t.h1a}
          <br />
          <span className="text-chinni">{t.h1b}</span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-tosh">{t.lead}</p>

        <div className="mt-8 max-w-2xl">
          <SearchBox script={script} size="katta" />
          {/* §5.3 — jonli hisoblagich, bir marta sanaladi */}
          <p className="mt-3 text-xs text-tosh">
            <CountUp value={totals.positions} /> {t.counter}
          </p>
        </div>

        {/* Qisqa raqamlar */}
        <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 sm:max-w-2xl sm:grid-cols-4">
          {[
            { v: formatNumber(totals.companies), k: t.companies },
            { v: formatNumber(totals.withSalary), k: t.withSalary },
            {
              v: totals.avgSalary ? formatNumber(totals.avgSalary) : '—',
              k: t.avg,
            },
            { v: '12', k: script === 'cyr' ? 'туман' : 'tuman' },
          ].map((s) => (
            <div key={s.k}>
              <dt className="sr-only">{s.k}</dt>
              <dd className="font-display text-lg font-600 text-matn">{s.v}</dd>
              <p className="text-xs text-tosh">{s.k}</p>
            </div>
          ))}
        </dl>
        </div>
      </section>

      <RecentlyViewed script={script} />

      {/* --- Ko'p qidirilayotganlar (PLAN §3.3) -------------------------- */}
      {topSearches.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <h2 className="mb-3 text-xs font-600 uppercase tracking-wide text-tosh">{t.popular}</h2>
          <ul className="flex flex-wrap gap-2">
            {topSearches.map((s) => (
              <li key={s.query_norm}>
                {/* `label` — foydalanuvchilar yozgan asl ko'rinish (apostrof bilan); `query_norm`
                    transliteratsiyaga yaramaydi (oqituvchi → оқитувчи). Server q'ni o'zi normalize qiladi. */}
                <Link
                  href={`/vakansiyalar?q=${encodeURIComponent(s.label)}`}
                  className="inline-block rounded-full border border-chiziq bg-yuza px-3.5 py-1.5 text-xs transition-colors hover:border-chinni hover:text-chinni"
                >
                  {transliterate(s.label, script)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- IMZO ELEMENT: tumanlar xaritasi (§5.3) ---------------------- */}
      <section className="border-y border-chiziq bg-yuza/50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-xl font-600">{t.districts}</h2>
          <p className="mt-2 text-sm text-tosh">{t.districtsLead}</p>
          <div className="mt-8">
            <DistrictMap counts={counts} script={script} />
          </div>
        </div>
      </section>

      {/* --- Top kasblar -------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-600">{t.topJobs}</h2>
          <Link href="/vakansiyalar" className="shrink-0 text-xs text-chinni hover:text-chinni-toq">
            {t.seeAll} →
          </Link>
        </div>

        <ul className="stagger mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {topPositions.map((p) => (
            <li key={p.position_search}>
              <Link
                href={`/vakansiyalar?q=${encodeURIComponent(p.position_search)}`}
                className="flex items-center justify-between gap-3 rounded-karta border border-chiziq bg-yuza px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-chinni/40"
              >
                <span className="line-clamp-1 text-sm">{transliterate(p.label, script)}</span>
                <span className="raqam shrink-0 text-xs text-tosh">
                  {formatNumber(p.positions)} {t.places}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
