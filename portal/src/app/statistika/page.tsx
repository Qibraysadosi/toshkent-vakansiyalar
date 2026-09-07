import type { Metadata } from 'next';
import { getStats } from '@/lib/queries';
import { getScript } from '@/lib/script';
import { districtLabel } from '@/lib/districts';
import { transliterate } from '@/lib/transliterate';
import { educationLabel, formatNumber } from '@/lib/format';
import { EducationSplit, HorizontalBars, SalaryColumns } from '@/components/charts/StatsCharts';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Statistika',
  description:
    "Toshkent mehnat bozori: tumanlar bo'yicha o'rtacha maosh, eng ko'p talab qilinadigan kasblar, " +
    "ta'lim darajasi taqsimoti — ochiq ma'lumot.",
  alternates: { canonical: '/statistika' },
};

const TEXT = {
  lat: {
    title: 'Toshkent mehnat bozori',
    lead: "Rasmiy oylik bazadan hisoblangan ochiq ko'rsatkichlar. Har import bilan yangilanadi.",
    places: "Ish o'rni",
    companies: 'Korxona',
    avgSalary: "O'rtacha maosh",
    withSalary: "Maoshi ko'rsatilgan",
    byDistrict: "Tumanlar bo'yicha ish o'rni",
    avgByDistrict: "Tumanlar bo'yicha o'rtacha maosh",
    salaryDist: 'Maosh taqsimoti',
    salaryDistLead: "Faqat maoshi raqam bilan ko'rsatilgan e'lonlar.",
    education: "Ta'lim darajasi",
    topJobs: "Eng ko'p talab qilinadigan 10 kasb",
    topPaying: 'Eng yuqori maoshli kasblar',
    topPayingLead: "Kamida 5 ta e'loni bor kasblar orasidan.",
    sum: "so'm",
    table: "Jadval ko'rinishida",
    district: 'Tuman',
    job: 'Kasb',
    range: 'Oraliq',
    level: 'Daraja',
    count: 'Soni',
    salary: 'Maosh',
    note: "Maoshi ko'rsatilmagan e'lonlar o'rtacha hisobga kirmaydi.",
  },
  cyr: {
    title: 'Тошкент меҳнат бозори',
    lead: 'Расмий ойлик базадан ҳисобланган очиқ кўрсаткичлар. Ҳар импорт билан янгиланади.',
    places: 'Иш ўрни',
    companies: 'Корхона',
    avgSalary: 'Ўртача маош',
    withSalary: 'Маоши кўрсатилган',
    byDistrict: 'Туманлар бўйича иш ўрни',
    avgByDistrict: 'Туманлар бўйича ўртача маош',
    salaryDist: 'Маош тақсимоти',
    salaryDistLead: 'Фақат маоши рақам билан кўрсатилган эълонлар.',
    education: 'Таълим даражаси',
    topJobs: 'Энг кўп талаб қилинадиган 10 касб',
    topPaying: 'Энг юқори маошли касблар',
    topPayingLead: 'Камида 5 та эълони бор касблар орасидан.',
    sum: 'сўм',
    table: 'Жадвал кўринишида',
    district: 'Туман',
    job: 'Касб',
    range: 'Оралиқ',
    level: 'Даража',
    count: 'Сони',
    salary: 'Маош',
    note: 'Маоши кўрсатилмаган эълонлар ўртача ҳисобга кирмайди.',
  },
} as const;

function Card({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-karta border border-chiziq bg-yuza p-6">
      <h2 className="font-display text-base font-600">{title}</h2>
      {lead && <p className="mt-1 text-xs text-tosh">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function StatsPage() {
  const script = await getScript();
  const t = TEXT[script];
  const s = await getStats();

  const districtRows = s.districts.map((d) => ({
    name: districtLabel(d.district, script),
    value: d.positions,
  }));

  const avgByDistrict = s.districts
    .filter((d) => d.avgSalary !== null)
    .map((d) => ({ name: districtLabel(d.district, script), value: Math.round(d.avgSalary ?? 0) }))
    .sort((a, b) => b.value - a.value);

  const topJobs = s.topPositions.map((p) => ({
    name: transliterate(p.label, script),
    value: p.positions,
  }));

  const topPaying = s.topPaying.map((p) => ({
    name: transliterate(p.label, script),
    value: Math.round(p.avg_salary),
  }));

  const education = s.education.map((e) => ({
    name: educationLabel(e.education, script) || e.education,
    value: e.count,
  }));
  const educationTotal = education.reduce((sum, e) => sum + e.value, 0);

  const salaryBuckets = s.salaryBuckets.map((b) => ({ name: b.bucket, value: b.count }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-xl font-600 sm:text-2xl">{t.title}</h1>
      <p className="mt-3 max-w-xl text-sm text-tosh">{t.lead}</p>

      {/* KPI qatori — bular grafik emas, raqamning o'zi */}
      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        {[
          { k: t.places, v: formatNumber(s.totals.positions) },
          { k: t.companies, v: formatNumber(s.totals.companies) },
          { k: t.avgSalary, v: s.totals.avgSalary ? formatNumber(s.totals.avgSalary) : '—' },
          { k: t.withSalary, v: formatNumber(s.totals.withSalary) },
        ].map((c) => (
          <div key={c.k}>
            <dd className="font-display text-lg font-600 text-matn">{c.v}</dd>
            <dt className="mt-0.5 text-xs text-tosh">{c.k}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-tosh">{t.note}</p>

      <div className="mt-10 grid gap-5">
        <Card title={t.byDistrict}>
          <HorizontalBars
            data={districtRows}
            suffix={script === 'cyr' ? 'иш ўрни' : "ish o'rni"}
            tableCaption={t.table}
            tableHead={[t.district, t.count]}
          />
        </Card>

        <Card title={t.avgByDistrict}>
          <HorizontalBars
            data={avgByDistrict}
            suffix={t.sum}
            tableCaption={t.table}
            tableHead={[t.district, t.salary]}
          />
        </Card>

        <Card title={t.salaryDist} lead={t.salaryDistLead}>
          <SalaryColumns
            data={salaryBuckets}
            suffix={script === 'cyr' ? 'эълон' : "e'lon"}
            tableCaption={t.table}
            tableHead={[t.range, t.count]}
          />
        </Card>

        <Card title={t.education}>
          <EducationSplit
            data={education}
            total={educationTotal}
            tableCaption={t.table}
            tableHead={[t.level, t.count]}
          />
        </Card>

        <Card title={t.topJobs}>
          <HorizontalBars
            data={topJobs}
            suffix={script === 'cyr' ? 'иш ўрни' : "ish o'rni"}
            tableCaption={t.table}
            tableHead={[t.job, t.count]}
          />
        </Card>

        <Card title={t.topPaying} lead={t.topPayingLead}>
          <HorizontalBars
            data={topPaying}
            suffix={t.sum}
            tableCaption={t.table}
            tableHead={[t.job, t.salary]}
          />
        </Card>
      </div>
    </div>
  );
}
