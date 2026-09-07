import { Suspense } from 'react';
import { getSearchLogSummary, getSynonyms } from '@/lib/queries';
import { SynonymChip, SynonymForm } from '../forms';
import { Card, Empty } from '../ui';

export const metadata = { title: 'Sinonimlar' };

export default async function AdminSynonymsPage() {
  const [synonyms, logs] = await Promise.all([getSynonyms(), getSearchLogSummary(100)]);
  const known = new Set(synonyms.map((s) => s.term));
  const suggestions = logs.filter((l) => l.results_count === 0 && !known.has(l.query_norm)).slice(0, 20);

  const groups = new Map<string, string[]>();
  for (const s of synonyms) groups.set(s.canonical, [...(groups.get(s.canonical) ?? []), s.term]);

  return (
    <div className="grid gap-5">
      <Card title="Sinonim qo'shish" lead="Ikkala so'z ham saqlashda normalize() dan o'tkaziladi: «Сторож» → «storoj».">
        <Suspense fallback={null}>
          <SynonymForm />
        </Suspense>
      </Card>

      {suggestions.length > 0 && (
        <Card title="Taklif: natija bermagan so'rovlar" lead="Bosing — so'rov formaga tushadi, mos so'zni yozib saqlang.">
          <ul className="flex flex-wrap gap-1.5">
            {suggestions.map((l) => (
              <li key={l.query_norm}>
                <a
                  href={`/admin/sinonimlar?term=${encodeURIComponent(l.query_norm)}`}
                  className="inline-block rounded-full border border-chiziq bg-yuza px-3 py-1 text-xs transition-colors hover:border-chinni hover:text-chinni"
                >
                  {l.query_norm} <span className="raqam text-tosh">×{l.hits}</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={`Mavjud sinonimlar (${synonyms.length})`} lead="× — o'chirish.">
        {synonyms.length === 0 ? (
          <Empty>Hali sinonim yo&apos;q.</Empty>
        ) : (
          <div className="grid gap-4">
            {[...groups].map(([canonical, terms]) => (
              <div key={canonical} className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-sm font-500">{canonical}</span>
                {terms.map((t) => (
                  <SynonymChip key={t} term={t} canonical={canonical} />
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
