'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSaved } from '@/lib/saved';
import type { VacancyListItem } from '@/lib/queries';
import type { Script } from '@/lib/transliterate';
import { VacancyCard, VacancyCardSkeleton } from '@/components/VacancyCard';

interface ApiRow {
  id: number;
  position: string;
  district: string;
  department: string | null;
  company: { stir: string; name: string };
  salary: number | null;
  salary_note: string | null;
  stavka: number | null;
  education: string | null;
  quota: string | null;
  positions_count: number;
  posted_date: string | null;
}

export function SavedList({ script }: { script: Script }) {
  const { ids, ready, clear } = useSaved();
  const [rows, setRows] = useState<VacancyListItem[] | null>(null);
  const cyr = script === 'cyr';

  useEffect(() => {
    if (!ready) return;
    if (ids.length === 0) {
      setRows([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/v1/vacancies?ids=${ids.join(',')}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json: { data: ApiRow[] }) =>
        setRows(
          json.data.map((d) => ({
            id: d.id,
            position: d.position,
            district: d.district,
            department: d.department,
            salary: d.salary === null ? null : String(d.salary),
            salary_note: d.salary_note,
            education: d.education,
            quota: d.quota,
            stavka: d.stavka === null ? null : String(d.stavka),
            posted_date: d.posted_date,
            positions_count: d.positions_count,
            views: 0,
            stir: d.company.stir,
            company_name: d.company.name,
            is_hidden: false,
          })),
        ),
      )
      .catch(() => setRows([]));
    return () => controller.abort();
  }, [ids, ready]);

  if (!ready || rows === null) {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{cyr ? 'Юкланмоқда…' : 'Yuklanmoqda…'}</span>
        <ul className="grid gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <VacancyCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="rounded-karta border border-dashed border-chiziq bg-yuza/60 px-6 py-14 text-center">
        <p className="font-display text-lg font-600">{cyr ? 'Ҳали бўш' : 'Hali bo’sh'}</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-tosh">
          {cyr
            ? 'Вакансия картасидаги белги тугмасини босинг — у шу ерда сақланади.'
            : 'Vakansiya kartasidagi belgi tugmasini bosing — u shu yerda saqlanadi.'}
        </p>
        <Link
          href="/vakansiyalar"
          className="mt-6 inline-block rounded-full bg-chinni px-5 py-2 text-xs font-500 text-chinni-ustida transition-colors hover:bg-chinni-toq"
        >
          {cyr ? 'Вакансияларга ўтиш' : "Vakansiyalarga o'tish"}
        </Link>
      </div>
    );
  }

  const missing = ids.length - rows.length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-tosh">
        <span>
          <span className="raqam text-matn">{rows.length}</span> {cyr ? 'та' : 'ta'}
          {missing > 0 && (
            <span>
              {' '}· {missing} {cyr ? 'таси энди эълонда йўқ' : "tasi endi e'londa yo'q"}
            </span>
          )}
        </span>
        <button type="button" onClick={clear} className="underline underline-offset-4 hover:text-chinni">
          {cyr ? 'Ҳаммасини тозалаш' : 'Hammasini tozalash'}
        </button>
      </div>
      <ul className="stagger grid gap-3">
        {rows.map((v) => (
          <li key={v.id}>
            <VacancyCard v={v} script={script} />
          </li>
        ))}
      </ul>
    </div>
  );
}
