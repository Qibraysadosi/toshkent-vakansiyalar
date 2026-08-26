'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ALL_DISTRICTS, PARAM, SORT_OPTIONS, activeChips, educationSlug } from '@/lib/search-params';
import { EDUCATION_LEVELS, SALARY_STEPS, STAVKA_OPTIONS, formatNumber } from '@/lib/format';
import type { Script } from '@/lib/transliterate';

const TEXT = {
  lat: {
    filters: 'Filtrlar',
    district: 'Tuman',
    education: "Ta'lim",
    stavka: 'Stavka',
    salary: 'Maosh',
    onlyWithSalary: "Faqat maoshi ko'rsatilganlar",
    onlyQuota: "Kvota yo'nalishi bo'yicha",
    clear: 'Tozalash',
    apply: "Ko'rsatish",
    sort: 'Saralash',
    close: 'Yopish',
  },
  cyr: {
    filters: 'Филтрлар',
    district: 'Туман',
    education: 'Таълим',
    stavka: 'Ставка',
    salary: 'Маош',
    onlyWithSalary: 'Фақат маоши кўрсатилганлар',
    onlyQuota: 'Квота йўналиши бўйича',
    clear: 'Тозалаш',
    apply: 'Кўрсатиш',
    sort: 'Саралаш',
    close: 'Ёпиш',
  },
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-chiziq pt-4">
      <legend className="mb-2.5 text-xs font-600 uppercase tracking-wide text-tosh">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 accent-[var(--color-chinni)]"
      />
      <span className={checked ? 'text-siyoh' : 'text-tosh'}>{label}</span>
      {count !== undefined && (
        <span className="raqam ml-auto text-xs text-tosh/70">{formatNumber(count)}</span>
      )}
    </label>
  );
}

export function FilterPanel({
  script,
  districtCounts,
}: {
  script: Script;
  districtCounts: Record<string, number>;
}) {
  const t = TEXT[script];
  const router = useRouter();
  const params = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  /** Filtr o'zgarganda sahifa 1 ga qaytadi — aks holda bo'sh sahifa chiqadi. */
  const push = useCallback(
    (next: URLSearchParams) => {
      next.delete(PARAM.page);
      const qs = next.toString();
      router.push(qs ? `/vakansiyalar?${qs}` : '/vakansiyalar', { scroll: false });
    },
    [router],
  );

  const toggleMulti = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      const current = next.getAll(key).flatMap((v) => v.split(','));
      next.delete(key);
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      for (const v of updated) next.append(key, v);
      push(next);
    },
    [params, push],
  );

  const setSingle = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null) next.delete(key);
      else next.set(key, value);
      push(next);
    },
    [params, push],
  );

  const has = (key: string, value: string) =>
    params.getAll(key).flatMap((v) => v.split(',')).includes(value);

  const chips = activeChips(params, script);

  const body = (
    <div className="flex flex-col gap-5">
      <Section title={t.district}>
        <div>
          {ALL_DISTRICTS.map((d) => (
            <Check
              key={d.slug}
              checked={has(PARAM.district, d.slug)}
              onChange={() => toggleMulti(PARAM.district, d.slug)}
              label={script === 'cyr' ? d.cyr : d.lat}
              count={districtCounts[d.db]}
            />
          ))}
        </div>
      </Section>

      <Section title={t.education}>
        {EDUCATION_LEVELS.map((e) => (
          <Check
            key={e.db}
            checked={has(PARAM.education, educationSlug(e.db))}
            onChange={() => toggleMulti(PARAM.education, educationSlug(e.db))}
            label={script === 'cyr' ? e.cyr : e.lat}
          />
        ))}
      </Section>

      <Section title={t.stavka}>
        <div className="flex flex-wrap gap-1.5">
          {STAVKA_OPTIONS.map((s) => {
            const on = has(PARAM.stavka, s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleMulti(PARAM.stavka, s.value)}
                aria-pressed={on}
                className={
                  on
                    ? 'raqam rounded-full bg-chinni px-3 py-1 text-xs text-white'
                    : 'raqam rounded-full border border-chiziq bg-oq px-3 py-1 text-xs text-tosh transition-colors hover:border-chinni hover:text-chinni'
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t.salary}>
        <div className="flex flex-wrap gap-1.5">
          {SALARY_STEPS.map((s) => {
            const on = params.get(PARAM.salaryMin) === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setSingle(PARAM.salaryMin, on ? null : s.value)}
                aria-pressed={on}
                className={
                  on
                    ? 'rounded-full bg-chinni px-3 py-1 text-xs text-white'
                    : 'rounded-full border border-chiziq bg-oq px-3 py-1 text-xs text-tosh transition-colors hover:border-chinni hover:text-chinni'
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <Check
            checked={params.get(PARAM.onlyWithSalary) === '1'}
            onChange={() =>
              setSingle(PARAM.onlyWithSalary, params.get(PARAM.onlyWithSalary) === '1' ? null : '1')
            }
            label={t.onlyWithSalary}
          />
          <Check
            checked={params.get(PARAM.onlyQuota) === '1'}
            onChange={() => setSingle(PARAM.onlyQuota, params.get(PARAM.onlyQuota) === '1' ? null : '1')}
            label={t.onlyQuota}
          />
        </div>
      </Section>

      {chips.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams();
            const q = params.get(PARAM.q);
            if (q) next.set(PARAM.q, q);
            push(next);
          }}
          className="self-start text-xs text-chinni underline underline-offset-4 hover:text-chinni-toq"
        >
          {t.clear}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* --- Desktop: chap ustun ------------------------------------ */}
      <aside className="bosmada-yashir hidden lg:block">
        <div className="sticky top-24">
          <h2 className="mb-4 font-display text-base font-600">{t.filters}</h2>
          {body}
        </div>
      </aside>

      {/* --- Mobil: pastdan chiqadigan sheet ------------------------- */}
      <div className="bosmada-yashir lg:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex-1 rounded-karta border border-chiziq bg-oq px-4 py-2.5 text-sm font-500"
          >
            {t.filters}
            {chips.length > 0 && <span className="raqam ml-1.5 text-chinni">({chips.length})</span>}
          </button>

          <select
            value={params.get(PARAM.sort) ?? 'yangi'}
            onChange={(e) => setSingle(PARAM.sort, e.target.value)}
            aria-label={t.sort}
            className="rounded-karta border border-chiziq bg-oq px-3 py-2.5 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {script === 'cyr' ? o.cyr : o.lat}
              </option>
            ))}
          </select>
        </div>

        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label={t.close}
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 bg-siyoh/40"
            />
            <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-qogoz p-5 pb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-600">{t.filters}</h2>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="rounded-full px-3 py-1 text-xs text-tosh hover:text-siyoh"
                >
                  {t.close}
                </button>
              </div>
              {body}
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="mt-6 w-full rounded-karta bg-chinni py-3 text-sm font-500 text-white"
              >
                {t.apply}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Ro'yxat tepasidagi faol filtr chiplari — ✕ bilan olib tashlanadi. */
export function ActiveFilterChips({ script }: { script: Script }) {
  const router = useRouter();
  const params = useSearchParams();
  const chips = activeChips(params, script);
  if (chips.length === 0) return null;

  function remove(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    const rest = next.getAll(key).flatMap((v) => v.split(',')).filter((v) => v !== value);
    next.delete(key);
    for (const v of rest) next.append(key, v);
    next.delete(PARAM.page);
    const qs = next.toString();
    router.push(qs ? `/vakansiyalar?${qs}` : '/vakansiyalar', { scroll: false });
  }

  return (
    <ul className="bosmada-yashir mb-4 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <li key={`${c.key}-${c.value}`}>
          <button
            type="button"
            onClick={() => remove(c.key, c.value)}
            className="flex items-center gap-1.5 rounded-full bg-chinni/12 py-1 pl-3 pr-2 text-xs text-chinni-toq transition-colors hover:bg-chinni/20"
          >
            {c.label}
            <span aria-hidden className="text-sm leading-none">
              ×
            </span>
            <span className="sr-only">{script === 'cyr' ? 'олиб ташлаш' : 'olib tashlash'}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
