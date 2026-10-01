import Link from 'next/link';
import {
  getImportHistory,
  getQualityReport,
  getSearchLogSummary,
  getSubscriptionStats,
  getTotals,
} from '@/lib/queries';
import { formatNumber } from '@/lib/format';
import { Card, Empty, Stat, TableWrap, td, th, thRow } from './ui';

export default async function AdminHome() {
  const [totals, quality, history, logs, subs] = await Promise.all([
    getTotals(),
    getQualityReport(),
    getImportHistory(5),
    getSearchLogSummary(8),
    getSubscriptionStats(),
  ]);

  const q = quality ?? { total: '0', no_salary: '0', unclear: '0', no_date: '0', no_department: '0', quota: '0', cyrillic: '0' };
  const pct = (n: string) => {
    const total = Number(q.total);
    if (!total) return '—';
    const share = (Number(n) / total) * 100;
    if (share === 0) return '0%';
    return share < 1 ? '<1%' : `${Math.round(share)}%`;
  };
  const zeroResult = logs.filter((l) => l.results_count === 0);

  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ish o'rni" value={formatNumber(totals.positions)} />
        <Stat label="Vakansiya yozuvi" value={formatNumber(totals.vacancies)} href="/admin/vakansiyalar" />
        <Stat label="Korxona" value={formatNumber(totals.companies)} />
        <Stat label="Telegram obunachi" value={formatNumber(subs.active)} href="/admin/obunachilar" />
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Oxirgi importlar"
          action={
            <Link href="/admin/import" className="text-xs text-chinni hover:text-chinni-toq">
              Yangi import →
            </Link>
          }
        >
          {history.length === 0 ? (
            <Empty>Hali import qilinmagan.</Empty>
          ) : (
            <TableWrap>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-chiziq">
                    <th scope="col" className={th}>Batch</th>
                    <th scope="col" className={`${th} text-right`}>Saqlandi</th>
                    <th scope="col" className={`${th} text-right`}>Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.batch} className="border-b border-chiziq last:border-0">
                      <td className={`${td} raqam`}>{h.batch}</td>
                      <td className={`${td} raqam text-right`}>{formatNumber(h.rows_merged)}</td>
                      <td className={`${td} text-right text-xs text-tosh whitespace-nowrap`}>
                        {new Date(h.created_at).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>

        <Card
          title="Natijasiz qidiruvlar"
          lead="Sinonim qo'shish uchun eng yaxshi manba."
          action={
            <Link href="/admin/loglar" className="text-xs text-chinni hover:text-chinni-toq">
              Barcha loglar →
            </Link>
          }
        >
          {zeroResult.length === 0 ? (
            <Empty>Hozircha hamma so&apos;rov natija bergan.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {zeroResult.map((l) => (
                <li key={l.query_norm}>
                  <Link
                    href={`/admin/sinonimlar?term=${encodeURIComponent(l.query_norm)}`}
                    className="inline-block rounded-full border border-chiziq bg-yuza px-3 py-1 text-xs transition-colors hover:border-chinni hover:text-chinni"
                  >
                    {l.query_norm} <span className="raqam text-tosh">×{l.hits}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Sifat hisoboti" lead="Joriy bazadagi yozuvlar bo'yicha.">
        <TableWrap>
          <table className="w-full">
            <tbody>
              {[
                ["Maoshi yo'q", q.no_salary],
                ['Maoshi aniqlashtirilmoqda', q.unclear],
                ["Sanasi yo'q", q.no_date],
                ["Bo'limi yo'q", q.no_department],
                ["Kvota yo'nalishida", q.quota],
                ['Lavozimi kirill yozuvida', q.cyrillic],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-chiziq last:border-0">
                  <th scope="row" className={thRow}>{label}</th>
                  <td className={`${td} raqam text-right`}>{formatNumber(value)}</td>
                  <td className={`${td} raqam w-16 text-right text-tosh`}>{pct(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
