import type { Metadata } from 'next';
import { adminEnabled, isAdmin } from '@/lib/admin-auth';
import {
  getImportHistory,
  getQualityReport,
  getSearchLogSummary,
  getSynonyms,
  getTotals,
} from '@/lib/queries';
import { formatNumber } from '@/lib/format';
import { AdminForms, LoginForm } from './forms';
import { logoutAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-karta border border-chiziq bg-oq p-6">
      <h2 className="font-display text-base font-600">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AdminPage() {
  if (!adminEnabled()) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-lg font-600">Admin panel yopiq</h1>
        <p className="mt-3 text-sm text-tosh">
          <code className="rounded bg-oq px-1.5 py-0.5">ADMIN_PASSWORD</code> muhit o&apos;zgaruvchisi
          o&apos;rnatilmagan. Uni <code className="rounded bg-oq px-1.5 py-0.5">.env.local</code> ga
          qo&apos;shing va serverni qayta ishga tushiring.
        </p>
      </div>
    );
  }

  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <h1 className="font-display text-lg font-600">Admin panel</h1>
        <p className="mt-2 text-sm text-tosh">Davom etish uchun parolni kiriting.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    );
  }

  const [totals, quality, history, synonyms, logs] = await Promise.all([
    getTotals(),
    getQualityReport(),
    getImportHistory(10),
    getSynonyms(),
    getSearchLogSummary(40),
  ]);

  const q = quality ?? {
    total: '0', no_salary: '0', unclear: '0', no_date: '0',
    no_department: '0', quota: '0', cyrillic: '0',
  };
  const pct = (n: string) => {
    const total = Number(q.total);
    if (!total) return '—';
    const share = (Number(n) / total) * 100;
    if (share === 0) return '0%';
    return share < 1 ? '<1%' : `${Math.round(share)}%`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-xl font-600">Admin panel</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-xs text-tosh underline underline-offset-4 hover:text-chinni">
            Chiqish
          </button>
        </form>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
        {[
          { k: "Ish o'rni", v: formatNumber(totals.positions) },
          { k: 'Vakansiya yozuvi', v: formatNumber(totals.vacancies) },
          { k: 'Korxona', v: formatNumber(totals.companies) },
          { k: "Maoshi ko'rsatilgan", v: formatNumber(totals.withSalary) },
        ].map((c) => (
          <div key={c.k}>
            <dd className="font-display text-lg font-600">{c.v}</dd>
            <dt className="text-xs text-tosh">{c.k}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-5">
        <AdminForms synonyms={synonyms} />

        <Card title="Sifat hisoboti">
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Maoshi yo\'q', q.no_salary],
                ['Maoshi aniqlashtirilmoqda', q.unclear],
                ['Sanasi yo\'q', q.no_date],
                ['Bo\'limi yo\'q', q.no_department],
                ['Kvota yo\'nalishida', q.quota],
                ['Lavozimi kirill yozuvida', q.cyrillic],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-chiziq last:border-0">
                  <td className="py-2 text-tosh">{label}</td>
                  <td className="raqam py-2 text-right">{formatNumber(value)}</td>
                  <td className="raqam w-16 py-2 text-right text-tosh">{pct(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Import tarixi">
          {history.length === 0 ? (
            <p className="text-sm text-tosh">Hali import qilinmagan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-chiziq text-left text-xs text-tosh">
                    <th scope="col" className="py-2 pr-4 font-500">Batch</th>
                    <th scope="col" className="py-2 pr-4 text-right font-500">O&apos;qildi</th>
                    <th scope="col" className="py-2 pr-4 text-right font-500">Saqlandi</th>
                    <th scope="col" className="py-2 text-right font-500">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.batch} className="border-b border-chiziq last:border-0">
                      <td className="py-2 pr-4">{h.batch}</td>
                      <td className="raqam py-2 pr-4 text-right">{formatNumber(h.rows_read)}</td>
                      <td className="raqam py-2 pr-4 text-right">{formatNumber(h.rows_merged)}</td>
                      <td className="py-2 text-right text-xs text-tosh">
                        {new Date(h.created_at).toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Qidiruv loglari">
          <p className="mb-3 text-xs text-tosh">
            Natijasi 0 bo&apos;lgan so&apos;rovlar — sinonim qo&apos;shish uchun eng yaxshi manba.
          </p>
          {logs.length === 0 ? (
            <p className="text-sm text-tosh">Hali qidiruv bo&apos;lmagan.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-oq">
                  <tr className="border-b border-chiziq text-left text-xs text-tosh">
                    <th scope="col" className="py-2 pr-4 font-500">So&apos;rov</th>
                    <th scope="col" className="py-2 pr-4 text-right font-500">Marta</th>
                    <th scope="col" className="py-2 text-right font-500">Natija</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.query_norm} className="border-b border-chiziq last:border-0">
                      <td className="py-2 pr-4">{l.query_norm}</td>
                      <td className="raqam py-2 pr-4 text-right">{l.hits}</td>
                      <td
                        className={`raqam py-2 text-right ${l.results_count === 0 ? 'text-[#a33]' : 'text-tosh'}`}
                      >
                        {l.results_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
