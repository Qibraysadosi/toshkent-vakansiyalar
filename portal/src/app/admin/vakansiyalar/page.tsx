import Link from 'next/link';
import { getHiddenVacancies, searchVacancies } from '@/lib/queries';
import { formatNumber, formatSalary } from '@/lib/format';
import { districtLabel } from '@/lib/districts';
import { HideToggle } from '../forms';
import { Card, Empty, TableWrap, td, th } from '../ui';

export const metadata = { title: 'Vakansiyalar' };

export default async function AdminVacanciesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const term = q.trim();

  const isId = /^\d+$/.test(term);
  const [found, hidden] = await Promise.all([
    term
      ? searchVacancies({ q: isId ? undefined : term, perPage: 30, includeHidden: true, sort: 'yangi' }).then((r) =>
          isId ? { ...r, rows: r.rows.filter((v) => v.id === Number(term)) } : r,
        )
      : Promise.resolve(null),
    getHiddenVacancies(100),
  ]);

  const Row = ({ v }: { v: (typeof hidden)[number] }) => {
    const salary = formatSalary(v.salary === null ? null : Number(v.salary), v.salary_note);
    return (
      <tr className={`border-b border-chiziq last:border-0 ${v.is_hidden ? 'opacity-60' : ''}`}>
        <td className={`${td} raqam text-tosh`}>{v.id}</td>
        <td className={td}>
          <Link href={`/vakansiya/${v.id}`} className="hover:text-chinni" target="_blank">
            {v.position}
          </Link>
          <div className="text-xs text-tosh">{v.company_name}</div>
        </td>
        <td className={`${td} whitespace-nowrap text-xs text-tosh`}>{districtLabel(v.district)}</td>
        <td className={`${td} raqam whitespace-nowrap text-right text-xs`}>{salary.muted ? <span className="text-tosh">{salary.text}</span> : salary.text}</td>
        <td className={`${td} text-right`}>
          <HideToggle id={v.id} hidden={v.is_hidden} />
        </td>
      </tr>
    );
  };

  const Table = ({ rows }: { rows: typeof hidden }) => (
    <TableWrap>
      <table className="w-full">
        <thead>
          <tr className="border-b border-chiziq">
            <th className={th}>ID</th>
            <th className={th}>Lavozim / korxona</th>
            <th className={th}>Tuman</th>
            <th className={`${th} text-right`}>Maosh</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <Row key={v.id} v={v} />
          ))}
        </tbody>
      </table>
    </TableWrap>
  );

  return (
    <div className="grid gap-5">
      <Card title="Vakansiyani topish" lead="ID raqami yoki lavozim/korxona nomi bo'yicha. Noto'g'ri yozuvni saytdan yashirish mumkin — bazadan o'chmaydi.">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="masalan: 36401 yoki qorovul"
            className="min-w-0 flex-1 rounded-karta border border-chiziq bg-yuza px-4 py-2.5 text-sm text-matn outline-none focus:border-chinni"
          />
          <button type="submit" className="rounded-karta bg-chinni px-5 py-2.5 text-sm font-500 text-white hover:bg-chinni-toq">
            Qidirish
          </button>
        </form>

        {found && (
          <div className="mt-5">
            <p className="mb-2 text-xs text-tosh">
              <span className="raqam text-matn">{formatNumber(isId ? found.rows.length : found.total)}</span> ta topildi
              {!isId && found.total > found.rows.length && ` (birinchi ${found.rows.length} tasi)`}
            </p>
            {found.rows.length === 0 ? <Empty>Topilmadi.</Empty> : <Table rows={found.rows} />}
          </div>
        )}
      </Card>

      <Card title={`Yashirilganlar (${hidden.length})`} lead="Bular saytda, qidiruvda va sitemap'da ko'rinmaydi.">
        {hidden.length === 0 ? <Empty>Yashirilgan yozuv yo&apos;q.</Empty> : <Table rows={hidden} />}
      </Card>
    </div>
  );
}
