import Link from 'next/link';
import type { Script } from '@/lib/transliterate';

function pageHref(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete('sahifa');
  else next.set('sahifa', String(page));
  const qs = next.toString();
  return qs ? `/vakansiyalar?${qs}` : '/vakansiyalar';
}

/** Sahifalar ro'yxati: 1 … 4 5 [6] 7 8 … 40 */
function pageWindow(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '...')[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) out.push('...');
  for (let i = from; i <= to; i++) out.push(i);
  if (to < total - 1) out.push('...');
  out.push(total);
  return out;
}

export function Pagination({
  page,
  perPage,
  total,
  params,
  script,
}: {
  page: number;
  perPage: number;
  total: number;
  params: URLSearchParams;
  script: Script;
}) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  const cyr = script === 'cyr';

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label={cyr ? 'Саҳифалар' : 'Sahifalar'}>
      {page > 1 && (
        <Link
          href={pageHref(params, page - 1)}
          rel="prev"
          className="rounded-md border border-chiziq bg-yuza px-3 py-2 text-xs text-tosh transition-colors hover:border-chinni hover:text-chinni"
        >
          {cyr ? 'Олдинги' : 'Oldingi'}
        </Link>
      )}

      {pageWindow(page, totalPages).map((p, i) =>
        p === '...' ? (
          <span key={`gap-${i}`} className="px-2 text-xs text-tosh">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(params, p)}
            aria-current={p === page ? 'page' : undefined}
            className={
              p === page
                ? 'raqam rounded-md bg-chinni px-3 py-2 text-xs text-chinni-ustida'
                : 'raqam rounded-md border border-chiziq bg-yuza px-3 py-2 text-xs text-tosh transition-colors hover:border-chinni hover:text-chinni'
            }
          >
            {p}
          </Link>
        ),
      )}

      {page < totalPages && (
        <Link
          href={pageHref(params, page + 1)}
          rel="next"
          className="rounded-md border border-chiziq bg-yuza px-3 py-2 text-xs text-tosh transition-colors hover:border-chinni hover:text-chinni"
        >
          {cyr ? 'Кейинги' : 'Keyingi'}
        </Link>
      )}
    </nav>
  );
}
