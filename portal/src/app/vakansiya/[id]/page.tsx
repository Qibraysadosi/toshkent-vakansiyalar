import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getSimilarVacancies, getVacancy, incrementViews } from '@/lib/queries';
import { getScript } from '@/lib/script';
import { districtLabel, districtByDbName } from '@/lib/districts';
import { transliterate } from '@/lib/transliterate';
import { quotaLabel } from '@/lib/quotas';
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
import { SaveButton } from '@/components/SaveButton';
import { CopyLink } from '@/components/CopyLink';
import { TrackView } from '@/components/RecentlyViewed';

// Layout cookie o'qiydi (alifbo/mavzu) — ISR baribir ishlamaydi, sahifa dinamik.
// Og'ir o'qishlar `queries.ts` da unstable_cache bilan keshlanadi.
export const dynamic = 'force-dynamic';

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
    city: 'Toshkent',
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
    city: 'Тошкент',
  },
} as const;

/**
 * URL'dagi id — faqat 1..15 xonali musbat butun son. `Number('abc')` / `1.5` / `1e21`
 * to'g'ridan-to'g'ri `bigint` ustuniga ketsa pg "invalid input syntax" bilan 500 beradi,
 * shuning uchun so'rovdan OLDIN tekshiriladi (opengraph-image.tsx da ham xuddi shu).
 */
function parseVacancyId(id: string): number | null {
  const n = /^\d{1,15}$/.test(id) ? Number(id) : Number.NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** generateMetadata va sahifa bitta so'rovni bo'lishadi — React.cache bir request ichida dedup qiladi. */
const getVacancyCached = cache(getVacancy);

/**
 * JSON-LD `<script>` ichiga qo'yiladi: `JSON.stringify` `<` ni ekranlamaydi, ya'ni
 * Excel'dan kelgan `</script><script>…` matni HTML'dan chiqib ketib bajarilardi.
 * `<` `>` `&` va U+2028/2029 unicode-escape qilinadi — JSON o'zgarmaydi.
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Bot/preview so'rovlari views hisobiga kirmaydi (sitemap crawl 12k ta UPDATE bermasin). */
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|telegram|whatsapp|preview|curl|wget|python-requests|headless/i;

/** `import_batch` "YYYY-MM" → keyingi oyning oxirgi kuni (JobPosting.validThrough). */
function validThroughFromBatch(batch: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(batch ?? '');
  if (!m) return null;
  // Date.UTC(yil, oy+1, 0): oy 1-asosli → indeks+1 = keyingi oy, kun 0 = o'sha oyning oxirgi kuni
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) + 1, 0));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vid = parseVacancyId(id);
  const v = vid === null ? null : await getVacancyCached(vid);
  if (!v || v.is_hidden) return { title: 'Topilmadi', robots: { index: false } };

  // Sarlavha/tavsif bitta alifboda — aks holda "ҚОРОВУЛ — Olmazor … so'm" aralashmasi chiqadi
  const script = await getScript();
  const t = TEXT[script];
  const salary = formatSalary(v.salary === null ? null : Number(v.salary), v.salary_note);
  const title = `${transliterate(v.position, script)} — ${districtLabel(v.district, script)}`;
  const description =
    `${transliterate(v.company_name, script)}. ${transliterate(salary.text, script)}. ` +
    `${districtLabel(v.district, script)}, ${t.city}.`;

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
  const vid = parseVacancyId(id);
  if (vid === null) notFound();

  const v = await getVacancyCached(vid);
  if (!v || v.is_hidden) notFound();

  const script = await getScript();
  const t = TEXT[script];

  // PLAN §6 — views++ javob yuborilgandan keyin (`after`), renderni kutdirmaydi; botlar hisoblanmaydi
  const ua = (await headers()).get('user-agent') ?? '';
  if (!BOT_UA.test(ua)) after(() => incrementViews(v.id).catch(() => {}));
  const similar = await getSimilarVacancies(v, 4);

  const salary = formatSalary(v.salary === null ? null : Number(v.salary), v.salary_note);
  const phones = splitPhones(v.company_phone);
  const district = districtByDbName(v.district);
  const shareUrl = `${siteUrl()}/vakansiya/${v.id}`;

  /* PLAN §10 — Google Jobs uchun JobPosting schema.org.
     `datePosted` majburiy — sanasi yo'q vakansiyada blok umuman chiqarilmaydi (null yuborilmaydi). */
  const validThrough = validThroughFromBatch(v.import_batch);
  const jobPosting = v.posted_date
    ? {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: transliterate(v.position, script),
        description: `${transliterate(v.position, script)}. ${transliterate(v.company_name, script)}. ${districtLabel(v.district, script)}, ${t.city}.`,
        datePosted: v.posted_date,
        ...(validThrough && { validThrough }),
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
            addressLocality: districtLabel(v.district, script),
            addressRegion: t.city,
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
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {jobPosting && (
        <script
          type="application/ld+json"
           
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jobPosting) }}
        />
      )}

      <TrackView id={v.id} position={v.position} district={v.district} />

      <Link href="/vakansiyalar" className="bosmada-yashir text-xs text-tosh hover:text-chinni">
        ← {t.back}
      </Link>

      <header className="mt-4">
        {v.positions_count > 1 && (
          <span className="mb-3 inline-block rounded-full bg-quyosh/15 px-3 py-1 text-xs font-500 text-quyosh-matn">
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
      <section className="mt-7 rounded-karta border border-chiziq bg-yuza p-6">
        <p className="text-xs text-tosh">{t.salary}</p>
        {salary.muted ? (
          <p className="mt-1 text-base text-tosh">{transliterate(salary.text, script)}</p>
        ) : (
          <p className="raqam mt-1 text-xl text-matn">{transliterate(salary.text, script)}</p>
        )}

        {/* Telefonda: raqam butun kenglikda, qolganlari 2 ustunda; katta ekranda bir qatorda */}
        <div className="bosmada-yashir mt-6 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
          {phones.map((p) => (
            <a
              key={p}
              href={`tel:+${p.replace(/\D/g, '')}`}
              className="raqam col-span-2 rounded-karta bg-chinni px-5 py-2.5 text-center text-sm text-chinni-ustida transition-colors hover:bg-chinni-toq sm:col-span-1"
            >
              {formatPhone(p)}
            </a>
          ))}
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(v.position)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-karta border border-chiziq px-4 py-2.5 text-center text-sm text-tosh transition-colors hover:border-chinni hover:text-chinni"
          >
            {t.share}
          </a>
          <CopyLink url={shareUrl} script={script} />
          <div className="col-span-2 sm:col-span-1">
            <SaveButton id={v.id} script={script} size="katta" />
          </div>
        </div>
        {phones.length === 0 && (
          <p className="mt-4 text-xs text-tosh">
            {script === 'cyr' ? 'Телефон рақами кўрсатилмаган.' : "Telefon raqami ko'rsatilmagan."}
          </p>
        )}
      </section>

      {/* --- To'liq ma'lumot -------------------------------------------- */}
      <dl className="mt-8 rounded-karta border border-chiziq bg-yuza px-6 py-2">
        <Row label={t.district}>{districtLabel(v.district, script)}</Row>
        {v.department && <Row label={t.department}>{transliterate(v.department, script)}</Row>}
        {v.education && <Row label={t.education}>{educationLabel(v.education, script)}</Row>}
        {v.stavka && (
          <Row label={t.stavka}>
            <span className="raqam">{transliterate(formatStavka(v.stavka), script)}</span>
          </Row>
        )}
        <Row label={t.places}><span className="raqam">{v.positions_count}</span></Row>
        {v.posted_date && (
          <Row label={t.posted}>{transliterate(formatDate(v.posted_date), script)}</Row>
        )}
        {/* Qisqa toifa nomi (quotaLabel); to'liq qonuniy matn — title'da. Noma'lum toifa xom matn bo'lib qaytadi, uni ham o'giramiz */}
        {v.quota && (
          <Row label={t.quota}>
            <span title={v.quota}>{transliterate(quotaLabel(v.quota, script), script)}</span>
          </Row>
        )}
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
