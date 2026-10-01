import { getImportHistory } from '@/lib/queries';
import { formatNumber } from '@/lib/format';
import { ImportWizard } from '../forms';
import { Card, Empty, TableWrap, td, th, xato } from '../ui';

export const metadata = { title: 'Import' };
// Vercel: import (tozalash + 12 ming qator yozish) 10 soniyalik standart
// chegaradan uzoqroq davom etishi mumkin.
export const maxDuration = 60;

export default async function AdminImportPage() {
  const history = await getImportHistory(20);
  const last = history[0]?.batch ?? null;

  return (
    <div className="grid gap-5">
      <Card title="Oylik import" lead="Yangi oy faylini yuklang. Eski batch faqat yangi yozuvlar muvaffaqiyatli yozilgandan keyin o'chiriladi; korxonalar saqlanib qoladi.">
        <ImportWizard lastBatch={last} />
      </Card>

      <Card title="Import tarixi">
        {history.length === 0 ? (
          <Empty>Hali import qilinmagan.</Empty>
        ) : (
          <TableWrap>
            <table className="w-full">
              <thead>
                <tr className="border-b border-chiziq">
                  <th scope="col" className={th}>Batch</th>
                  <th scope="col" className={`${th} text-right`}>O&apos;qildi</th>
                  <th scope="col" className={`${th} text-right`}>Saqlandi</th>
                  <th scope="col" className={`${th} text-right`}>Takror</th>
                  <th scope="col" className={`${th} text-right`}>Xato</th>
                  <th scope="col" className={`${th} text-right`}>Sana</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const e = (h.errors ?? {}) as { duplicatesMerged?: number; rows?: unknown[] };
                  return (
                    <tr key={h.batch} className="border-b border-chiziq last:border-0">
                      <td className={`${td} raqam`}>{h.batch}</td>
                      <td className={`${td} raqam text-right`}>{formatNumber(h.rows_read)}</td>
                      <td className={`${td} raqam text-right`}>{formatNumber(h.rows_merged)}</td>
                      <td className={`${td} raqam text-right text-tosh`}>{formatNumber(e.duplicatesMerged ?? 0)}</td>
                      <td className={`${td} raqam text-right ${e.rows?.length ? xato : 'text-tosh'}`}>{e.rows?.length ?? 0}</td>
                      <td className={`${td} text-right text-xs text-tosh whitespace-nowrap`}>{new Date(h.created_at).toLocaleString('ru-RU')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
