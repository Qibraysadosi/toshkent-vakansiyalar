import Link from 'next/link';
import { districtLabel } from '@/lib/districts';
import { formatRelativeDate, formatSalary, positionsBadge } from '@/lib/format';
import { transliterate, type Script } from '@/lib/transliterate';
import type { VacancyListItem } from '@/lib/queries';
import { SaveButton } from './SaveButton';

/** E'lon bazadagi eng so'nggi sanadan 2 kun ichida bo'lsa — "Yangi". */
export function isNew(postedDate: string | null, newSince: string | null | undefined): boolean {
  if (!postedDate || !newSince) return false;
  const posted = new Date(postedDate).getTime();
  const latest = new Date(newSince).getTime();
  return latest - posted <= 2 * 86_400_000;
}

/**
 * PLAN §5.4 — lavozim → korxona + tuman → maosh.
 * O'ng yuqorida "N ta o'rin" faqat N > 1 bo'lganda (yagona `quyosh` nuqtasi)
 * va saqlash tugmasi (anchor tashqarisida — HTML qoidasi).
 */
export function VacancyCard({
  v,
  script,
  newSince,
  showSave = true,
}: {
  v: VacancyListItem;
  script: Script;
  newSince?: string | null;
  showSave?: boolean;
}) {
  const salary = formatSalary(v.salary === null ? null : Number(v.salary), v.salary_note);
  const badge = positionsBadge(v.positions_count);
  const fresh = isNew(v.posted_date, newSince);

  return (
    <article className="group relative rounded-karta border border-chiziq bg-yuza shadow-karta transition-all duration-150 hover:-translate-y-0.5 hover:border-chinni/40 hover:shadow-kotarilgan">
      <Link href={`/vakansiya/${v.id}`} className="block p-5 pr-16 sm:pr-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-600 leading-snug text-matn group-hover:text-chinni">
              {transliterate(v.position, script)}
            </h3>
            <p className="mt-1.5 line-clamp-1 text-xs text-tosh">{transliterate(v.company_name, script)}</p>
          </div>

          {badge && (
            <span className="hidden shrink-0 rounded-full bg-quyosh/15 px-2.5 py-1 text-xs font-500 text-quyosh-matn sm:inline-block sm:mr-11">
              {transliterate(badge, script)}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {salary.muted ? (
              <span className="inline-block rounded-md bg-fon px-2 py-1 text-xs text-tosh">
                {transliterate(salary.text, script)}
              </span>
            ) : (
              <span className="raqam text-base text-matn">{salary.text}</span>
            )}
            {badge && (
              <span className="rounded-full bg-quyosh/15 px-2 py-0.5 text-[11px] font-500 text-quyosh-matn sm:hidden">
                {transliterate(badge, script)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-tosh">
            {fresh && (
              <span className="inline-flex items-center gap-1 text-chinni">
                <span aria-hidden className="size-1.5 rounded-full bg-chinni" />
                {script === 'cyr' ? 'Янги' : 'Yangi'}
              </span>
            )}
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

      {showSave && (
        <div className="absolute right-3 top-3">
          <SaveButton id={v.id} script={script} />
        </div>
      )}
    </article>
  );
}

/** §5.4 — spinner emas, karta shaklidagi shimmer. */
export function VacancyCardSkeleton() {
  return (
    <div className="rounded-karta border border-chiziq bg-yuza p-5">
      <div className="skeleton h-5 w-3/4 rounded" />
      <div className="skeleton mt-3 h-3.5 w-1/2 rounded" />
      <div className="mt-6 flex justify-between">
        <div className="skeleton h-5 w-32 rounded" />
        <div className="skeleton h-3.5 w-24 rounded" />
      </div>
    </div>
  );
}
