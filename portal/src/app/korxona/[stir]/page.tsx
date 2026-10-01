import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompany, getLatestPostedDate, searchVacancies } from '@/lib/queries';
import { getScript } from '@/lib/script';
import { districtLabel } from '@/lib/districts';
import { transliterate } from '@/lib/transliterate';
import { formatDate, formatNumber, formatPhone, splitPhones } from '@/lib/format';
import { VacancyCard } from '@/components/VacancyCard';

/* Layout cookie o'qiydi — marshrut baribir dinamik, `revalidate` ishlamas edi. Oshkora dinamik. */
export const dynamic = 'force-dynamic';

const TEXT = {
  lat: {
    vacancies: 'Vakansiyalar',
    places: "ish o'rni",
    stir: 'STIR',
    phone: 'Telefon',
    district: 'Tuman',
    address: 'Manzil',
    activity: 'Faoliyat turi',
    registered: "Ro'yxatdan o'tgan",
    status: 'Holati',
    official: 'Rasmiy nomi',
    external: 'orginfo.uz da ochish',
    notEnriched:
      "Qo'shimcha ma'lumot hali yig'ilmagan — bazadagi asosiy ma'lumot ko'rsatilmoqda.",
    back: 'Barcha vakansiyalar',
  },
  cyr: {
    vacancies: 'Вакансиялар',
    places: 'иш ўрни',
    stir: 'СТИР',
    phone: 'Телефон',
    district: 'Туман',
    address: 'Манзил',
    activity: 'Фаолият тури',
    registered: 'Рўйхатдан ўтган',
    status: 'Ҳолати',
    official: 'Расмий номи',
    external: 'orginfo.uz да очиш',
    notEnriched: 'Қўшимча маълумот ҳали йиғилмаган — базадаги асосий маълумот кўрсатилмоқда.',
    back: 'Барча вакансиялар',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stir: string }>;
}): Promise<Metadata> {
  const { stir } = await params;
  const c = await getCompany(stir);
  if (!c || c.vacancy_count === 0) return { title: 'Topilmadi', robots: { index: false } };
  return {
    title: `${c.name} — vakansiyalar`,
    description: `${c.name} (STIR ${c.stir}) korxonasidagi ${c.positions_count} ta bo'sh ish o'rni.`,
    alternates: { canonical: `/korxona/${c.stir}` },
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 border-b border-chiziq py-3 last:border-0">
      <dt className="shrink-0 text-xs text-tosh">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}

export default async function CompanyPage({ params }: { params: Promise<{ stir: string }> }) {
  const { stir } = await params;
  if (!/^\d{9}$/.test(stir)) notFound();

  const company = await getCompany(stir);
  // Ko'rinadigan vakansiyasi qolmagan korxona (eski import yoki hammasi yashirilgan) — 404
  if (!company || company.vacancy_count === 0) notFound();

  const script = await getScript();
  const t = TEXT[script];
  const cyr = script === 'cyr';

  const [result, newSince] = await Promise.all([
    searchVacancies({ stir, perPage: 50, sort: 'yangi' }),
    getLatestPostedDate(),
  ]);
  const phones = splitPhones(company.phone);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav className="text-xs text-tosh">
        <Link href="/vakansiyalar" className="hover:text-chinni">
          {t.back}
        </Link>
      </nav>

      <h1 className="mt-3 font-display text-xl font-600 leading-tight sm:text-2xl">
        {transliterate(company.name, script)}
      </h1>
      <p className="mt-2 text-sm text-tosh">
        <span className="raqam">{formatNumber(company.positions_count)}</span> {t.places}
        {company.district && ` · ${districtLabel(company.district, script)}`}
      </p>

      <dl className="mt-7 rounded-karta border border-chiziq bg-yuza px-6 py-2">
        <Row label={t.stir}>
          <span className="raqam">{company.stir}</span>
        </Row>
        {company.official_name && <Row label={t.official}>{transliterate(company.official_name, script)}</Row>}
        {phones.length > 0 && (
          <Row label={t.phone}>
            <div className="flex flex-col items-end gap-1">
              {phones.map((p) => (
                <a key={p} href={`tel:+${p.replace(/\D/g, '')}`} className="raqam text-chinni hover:text-chinni-toq">
                  {formatPhone(p)}
                </a>
              ))}
            </div>
          </Row>
        )}
        {company.district && <Row label={t.district}>{districtLabel(company.district, script)}</Row>}
        {company.address && <Row label={t.address}>{transliterate(company.address, script)}</Row>}
        {company.activity_type && <Row label={t.activity}>{transliterate(company.activity_type, script)}</Row>}
        {company.registered_date && <Row label={t.registered}>{formatDate(company.registered_date, script)}</Row>}
        {company.status && <Row label={t.status}>{transliterate(company.status, script)}</Row>}
      </dl>

      {!company.enriched_at && <p className="mt-3 text-xs text-tosh">{t.notEnriched}</p>}

      <a
        href={`https://orginfo.uz/uz/search/organizations/?q=${company.stir}`}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="bosmada-yashir mt-4 inline-block text-xs text-chinni hover:text-chinni-toq"
      >
        {t.external} →
      </a>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-base font-600">
          {t.vacancies} <span className="raqam text-tosh">({formatNumber(result.total)})</span>
        </h2>
        <ul className="stagger grid gap-3">
          {result.rows.map((v) => (
            <li key={v.id}>
              <VacancyCard v={v} script={script} newSince={newSince} />
            </li>
          ))}
        </ul>
        {result.total > result.rows.length && (
          <p className="mt-4 text-xs text-tosh">
            {cyr ? 'Биринчи' : 'Birinchi'} {result.rows.length} {cyr ? 'таси кўрсатилди.' : 'tasi ko’rsatildi.'}
          </p>
        )}
      </section>
    </div>
  );
}
