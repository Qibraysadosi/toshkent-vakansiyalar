import Link from 'next/link';
import { districtLabel } from '@/lib/districts';
import { formatRelativeDate, formatSalary, positionsBadge } from '@/lib/format';
import { transliterate, type Script } from '@/lib/transliterate';
import type { VacancyListItem } from '@/lib/queries';

/**
 * PLAN §5.4 — lavozim → korxona + tuman → maosh.
 * O'ng yuqorida "N ta o'rin" faqat N > 1 bo'lganda (yagona `quyosh` nuqtasi).
 * Butun karta bosiladi, hover'da 2px ko'tarilish.
 */
export function VacancyCard({ v, script }: { v: VacancyListItem; script: Script }) {
  const salary = formatSalary(v.salary === null ? null : Number(v.salary), v.salary_note);
  const badge = positionsBadge(v.positions_count);

  return (
    <Link
      href={`/vakansiya/${v.id}`}
      className="group relative block rounded-karta border border-chiziq bg-oq p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-chinni/40 hover:shadow-[0_6px_20px_-8px_rgba(16,35,58,0.25)]"
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-quyosh/15 px-2.5 py-1 text-xs font-500 text-[#8a6011]">
          {script === 'cyr' ? transliterate(badge, 'cyr') : badge}
        </span>
      )}

      <h3 className={`text-base font-600 leading-snug text-siyoh group-hover:text-chinni ${badge ? 'pr-24' : ''}`}>
        {transliterate(v.position, script)}
      </h3>

      <p className="mt-1.5 text-xs text-tosh">
        <span className="line-clamp-1">{transliterate(v.company_name, script)}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          {salary.muted ? (
            <span className="inline-block rounded-md bg-qogoz px-2 py-1 text-xs text-tosh">
              {transliterate(salary.text, script)}
            </span>
          ) : (
            <span className="raqam text-base text-siyoh">{salary.text}</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-tosh">
          <span>{districtLabel(v.district, script)}</span>
          {v.posted_date && (
            <>
              <span aria-hidden>·</span>
              <span>{transliterate(formatRelativeDate(v.posted_date), script)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/** §5.4 — spinner emas, karta shaklidagi shimmer. */
export function VacancyCardSkeleton() {
  return (
    <div className="rounded-karta border border-chiziq bg-oq p-5">
      <div className="skeleton h-5 w-3/4 rounded" />
      <div className="skeleton mt-3 h-3.5 w-1/2 rounded" />
      <div className="mt-6 flex justify-between">
        <div className="skeleton h-5 w-32 rounded" />
        <div className="skeleton h-3.5 w-24 rounded" />
      </div>
    </div>
  );
}
