import Link from 'next/link';
import { getSearchLogSummary } from '@/lib/queries';
import { Card, Empty, TableWrap, td, th, xato } from '../ui';

export const metadata = { title: 'Qidiruv loglari' };

export default async function AdminLogsPage() {
  const logs = await getSearchLogSummary(200);
  const total = logs.reduce((s, l) => s + l.hits, 0);
  const zero = logs.filter((l) => l.results_count === 0).length;

  return (
    <Card
      title="Qidiruv loglari"
      lead={`${total} ta qidiruv, ${logs.length} xil so'rov, ${zero} tasi natijasiz. Natijasiz so'rovga bosib sinonim qo'shing.`}
    >
      {logs.length === 0 ? (
        <Empty>Hali qidiruv bo&apos;lmagan.</Empty>
      ) : (
        <TableWrap>
          <table className="w-full">
            <thead>
              <tr className="border-b border-chiziq">
                <th scope="col" className={th}>So&apos;rov</th>
                <th scope="col" className={`${th} text-right`}>Marta</th>
                <th scope="col" className={`${th} text-right`}>Natija</th>
                <th scope="col" className={`${th} text-right`}>Oxirgi</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.query_norm} className="border-b border-chiziq last:border-0">
                  <td className={td}>
                    {l.results_count === 0 ? (
                      <Link href={`/admin/sinonimlar?term=${encodeURIComponent(l.query_norm)}`} className="text-chinni hover:text-chinni-toq">
                        {l.query_norm}
                      </Link>
                    ) : (
                      <Link href={`/vakansiyalar?q=${encodeURIComponent(l.query_norm)}`} className="hover:text-chinni">
                        {l.query_norm}
                      </Link>
                    )}
                  </td>
                  <td className={`${td} raqam text-right`}>{l.hits}</td>
                  <td className={`${td} raqam text-right ${l.results_count === 0 ? xato : 'text-tosh'}`}>{l.results_count}</td>
                  <td className={`${td} text-right text-xs text-tosh whitespace-nowrap`}>{new Date(l.last_at).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Card>
  );
}
