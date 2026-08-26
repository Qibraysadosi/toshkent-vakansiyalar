import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSimilarVacancies, getVacancy, incrementViews } from '@/lib/queries';
import { getScript } from '@/lib/script';
import { districtLabel, districtByDbName } from '@/lib/districts';
import { transliterate } from '@/lib/transliterate';
import {
  educationLabel,
  formatDate,
  formatNumber,
  formatPhone,
  formatSalary,
  formatStavka,
  splitPhones,
} from '@/lib/format';
import { siteUrl } from '@/lib/env';
import { VacancyCard } from '@/components/VacancyCard';

export const revalidate = 86400; // PLAN §10 — detallar 24 soat

const TEXT = {
  lat: {
    call: 'Raqamga qo’ng’iroq qilish',
    share: 'Telegramda ulashish',
    salary: 'Maosh',
    stavka: 'Stavka',
    education: "Ta'lim",
    district: 'Tuman',
    department: "Bo'lim",
    quota: 'Kvota yo’nalishi',
    posted: 'E’lon qilingan',
    places: 'Ish o’rni soni',
    company: 'Korxona',
    stir: 'STIR',
    similar: 'O’xshash vakansiyalar',
    allFromCompany: 'Shu korxonaning barcha vakansiyalari',
    back: 'Vakansiyalarga qaytish',
    views: 'marta ko’rilgan',
  },
  cyr: {
    call: 'Рақамга қўнғироқ қилиш',
    share: 'Телеграмда улашиш',
    salary: 'Маош',
    stavka: 'Ставка',
    education: 'Таълим',
    district: 'Туман',
    department: 'Бўлим',
    quota: 'Квота йўналиши',
    posted: 'Эълон қилинган',
    places: 'Иш ўрни сони',
    company: 'Корхона',
    stir: 'СТИР',
    similar: 'Ўхшаш вакансиялар',
    allFromCompany: 'Шу корхонанинг барча вакансиялари',
    back: 'Вакансияларга қайтиш',
    views: 'марта кўрилган',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const v = await getVacancy(Number(id));
  if (!v) return { title: 'Topilmadi' };

  const salary = formatSalary(v.salary === null ? null : Number(v.salary), v.salary_note);
  const title = `${v.position} — ${districtLabel(v.district)}`;
  const description = `${v.company_name}. ${salary.text}. ${districtLabel(v.district)}, Toshkent.`;

  return {
    title,
    description,
    alternates: { canonical: `/vakansiya/${v.id}` },
    openGraph: {
      title,
      description,
      url: `/vakansiya/${v.id}`,
      images: [`/vakansiya/${v.id}/opengraph-image`],
    },
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

export default async function VacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const v = await getVacancy(numericId);
  if (!v) notFound();

  const script = await getScript();
  const t = TEXT[script];

  // PLAN §6 — views++ (sahifa ISR bilan keshlanadi, hisob taxminiy)
  await incrementViews(v.id).catch(() => {});
  const similar = await getSimilarVacancies(v, 4);

  const salary = formatSalary(v.salary === null ? null : Number(v.salary), v.salary_note);
  const phones = splitPhones(v.company_phone);
  const district = districtByDbName(v.district);
  const shareUrl = `${siteUrl()}/vakansiya/${v.id}`;

  /* PLAN §10 — Google Jobs uchun JobPosting schema.org */
  const jobPosting = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: v.position,
    description: `${v.position}. ${v.company_name}. ${districtLabel(v.district)}, Toshkent.`,
    datePosted: v.posted_date,
    employmentType: Number(v.stavka) >= 1 ? 'FULL_TIME' : 'PART_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: v.company_name,
      identifier: { '@type': 'PropertyValue', name: 'STIR', value: v.stir },
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: districtLabel(v.district),
        addressRegion: 'Toshkent',
        addressCountry: 'UZ',
      },
    },
    ...(v.salary !== null && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'UZS',
        value: { '@type': 'QuantitativeValue', value: Number(v.salary), unitText: 'MONTH' },
      },
    }),
    ...(v.education && { educationRequirements: v.education }),
    totalJobOpenings: v.positions_count,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }}
      />

      <Link href="/vakansiyalar" className="bosmada-yashir text-xs text-tosh hover:text-chinni">
        ← {t.back}
      </Link>

      <header className="mt-4">
        {v.positions_count > 1 && (
          <span className="mb-3 inline-block rounded-full bg-quyosh/15 px-3 py-1 text-xs font-500 text-[#8a6011]">
            {v.positions_count} {script === 'cyr' ? 'та ўрин' : "ta o'rin"}
          </span>
        )}
        <h1 className="font-display text-xl font-600 leading-tight sm:text-2xl">
          {transliterate(v.position, script)}
        </h1>
        <p className="mt-3 text-sm text-tosh">
          <Link href={`/korxona/${v.stir}`} className="text-chinni hover:text-chinni-toq">
            {transliterate(v.company_name, script)}
          </Link>
          {district && (
            <>
              {' · '}
              <Link href={`/tuman/${district.slug}`} className="hover:text-chinni">
                {script === 'cyr' ? district.cyr : district.lat}
              </Link>
            </>
          )}
        </p>
      </header>

      {/* --- Maosh + harakat tugmalari ---------------------------------- */}
      <section className="mt-7 rounded-karta border border-chiziq bg-oq p-6">
        <p className="text-xs text-tosh">{t.salary}</p>
        {salary.muted ? (
          <p className="mt-1 text-base text-tosh">{transliterate(salary.text, script)}</p>
        ) : (
          <p className="raqam mt-1 text-xl text-siyoh">{salary.text}</p>
        )}

        <div className="bosmada-yashir mt-6 flex flex-wrap gap-2.5">
          {phones.map((p) => (
            <a
              key={p}
              href={`tel:+${p.replace(/\D/g, '')}`}
              className="raqam rounded-karta bg-chinni px-5 py-2.5 text-sm text-white transition-colors hover:bg-chinni-toq"
            >
              {formatPhone(p)}
            </a>
          ))}
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(v.position)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-karta border border-chiziq px-5 py-2.5 text-sm text-tosh transition-colors hover:border-chinni hover:text-chinni"
          >
            {t.share}
          </a>
        </div>
        {phones.length === 0 && (
          <p className="mt-4 text-xs text-tosh">
            {script === 'cyr' ? 'Телефон рақами кўрсатилмаган.' : "Telefon raqami ko'rsatilmagan."}
          </p>
        )}
      </section>

      {/* --- To'liq ma'lumot -------------------------------------------- */}
      <dl className="mt-8 rounded-karta border border-chiziq bg-oq px-6 py-2">
        <Row label={t.district}>{districtLabel(v.district, script)}</Row>
        {v.department && <Row label={t.department}>{transliterate(v.department, script)}</Row>}
        {v.education && <Row label={t.education}>{educationLabel(v.education, script)}</Row>}
        {v.stavka && <Row label={t.stavka}><span className="raqam">{formatStavka(v.stavka)}</span></Row>}
        <Row label={t.places}><span className="raqam">{v.positions_count}</span></Row>
        {v.posted_date && (
          <Row label={t.posted}>{transliterate(formatDate(v.posted_date), script)}</Row>
        )}
        {v.quota && <Row label={t.quota}>{transliterate(v.quota, script)}</Row>}
        <Row label={t.stir}>
          <Link href={`/korxona/${v.stir}`} className="raqam text-chinni hover:text-chinni-toq">
            {v.stir}
          </Link>
        </Row>
      </dl>

      <p className="mt-3 text-right text-xs text-tosh">
        {/* Hisoblagich o'qilgandan keyin oshiriladi — joriy ko'rishni ham qo'shamiz */}
        <span className="raqam">{formatNumber(v.views + 1)}</span> {t.views}
      </p>

      {/* --- O'xshash vakansiyalar --------------------------------------- */}
      {similar.length > 0 && (
        <section className="bosmada-yashir mt-12">
          <h2 className="mb-4 font-display text-base font-600">{t.similar}</h2>
          <ul className="stagger grid gap-3">
            {similar.map((s) => (
              <li key={s.id}>
                <VacancyCard v={s} script={script} />
              </li>
            ))}
          </ul>
          <Link
            href={`/korxona/${v.stir}`}
            className="mt-5 inline-block text-xs text-chinni hover:text-chinni-toq"
          >
            {t.allFromCompany} →
          </Link>
        </section>
      )}
    </div>
  );
}
