import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DISTRICTS, districtBySlug } from '@/lib/districts';
import { getDistrictCounts, searchVacancies } from '@/lib/queries';
import { getScript } from '@/lib/script';
import { formatNumber } from '@/lib/format';
import { VacancyCard } from '@/components/VacancyCard';

export const revalidate = 3600;

/** 12 ta SEO sahifa oldindan generatsiya qilinadi (PLAN §6). */
export function generateStaticParams() {
  return DISTRICTS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = districtBySlug(slug);
  if (!d) return { title: 'Topilmadi' };
  return {
    title: `${d.lat} tumani vakansiyalari`,
    description: `${d.lat} tumanidagi bo'sh ish o'rinlari: maosh, korxona va telefon ma'lumotlari bilan.`,
    alternates: { canonical: `/tuman/${d.slug}` },
  };
}

export default async function DistrictPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = districtBySlug(slug);
  if (!d) notFound();

  const script = await getScript();
  const cyr = script === 'cyr';

  const [result, counts] = await Promise.all([
    searchVacancies({ districts: [d.db], perPage: 20, sort: 'yangi' }),
    getDistrictCounts(),
  ]);
  const stat = counts.find((c) => c.district === d.db);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <nav className="text-xs text-tosh">
        <Link href="/" className="hover:text-chinni">
          {cyr ? 'Бош саҳифа' : 'Bosh sahifa'}
        </Link>
        {' / '}
        <span>{cyr ? d.cyr : d.lat}</span>
      </nav>

      <h1 className="mt-3 font-display text-xl font-600 sm:text-2xl">
        {cyr ? `${d.cyr} тумани вакансиялари` : `${d.lat} tumani vakansiyalari`}
      </h1>

      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        <div>
          <dd className="raqam text-lg text-chinni">{formatNumber(stat?.positions ?? 0)}</dd>
          <dt className="text-xs text-tosh">{cyr ? 'иш ўрни' : "ish o'rni"}</dt>
        </div>
        <div>
          <dd className="raqam text-lg">{formatNumber(stat?.vacancies ?? 0)}</dd>
          <dt className="text-xs text-tosh">{cyr ? 'эълон' : "e'lon"}</dt>
        </div>
        {stat?.avgSalary && (
          <div>
            <dd className="raqam text-lg">{formatNumber(stat.avgSalary)}</dd>
            <dt className="text-xs text-tosh">{cyr ? 'ўртача маош' : "o'rtacha maosh"}</dt>
          </div>
        )}
      </dl>

      <ul className="stagger mt-8 grid gap-3">
        {result.rows.map((v) => (
          <li key={v.id}>
            <VacancyCard v={v} script={script} />
          </li>
        ))}
      </ul>

      {result.total > result.rows.length && (
        <Link
          href={`/vakansiyalar?tuman=${d.slug}`}
          className="mt-8 inline-block rounded-karta bg-chinni px-5 py-2.5 text-sm text-white transition-colors hover:bg-chinni-toq"
        >
          {cyr ? 'Барчасини кўриш' : "Barchasini ko'rish"} ({formatNumber(result.total)})
        </Link>
      )}

      <section className="mt-14 border-t border-chiziq pt-8">
        <h2 className="mb-4 text-xs font-600 uppercase tracking-wide text-tosh">
          {cyr ? 'Бошқа туманлар' : 'Boshqa tumanlar'}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {DISTRICTS.filter((x) => x.slug !== d.slug).map((x) => (
            <li key={x.slug}>
              <Link
                href={`/tuman/${x.slug}`}
                className="inline-block rounded-full border border-chiziq bg-oq px-3.5 py-1.5 text-xs transition-colors hover:border-chinni hover:text-chinni"
              >
                {cyr ? x.cyr : x.lat}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
