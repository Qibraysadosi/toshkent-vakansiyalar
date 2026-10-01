import Link from 'next/link';
import type { ActionState } from './actions';

/** Admin bo'limlari uchun umumiy mayda qismlar (server komponentlar). */

export function Card({ title, lead, action, children }: { title: string; lead?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-karta border border-chiziq bg-yuza p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-600">{title}</h2>
          {lead && <p className="mt-1 text-xs text-tosh">{lead}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * KPI kartasi — `<dl>` ning bevosita farzandi. `<dl>` faqat dt/dd/div qabul
 * qiladi va dt dd'dan oldin kelishi shart, shuning uchun havola karta atrofida
 * emas, atama ichida (`after:inset-0` bilan butun kartaga cho'zilgan);
 * vizual tartib (qiymat tepada) `flex-col-reverse` bilan.
 */
export function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div
      className={`relative flex flex-col-reverse rounded-karta border border-chiziq bg-yuza p-4 ${
        href ? 'transition-colors hover:border-chinni' : ''
      }`}
    >
      <dt className="mt-0.5 text-xs text-tosh">
        {href ? (
          <Link href={href} className="after:absolute after:inset-0 hover:text-chinni">
            {label}
          </Link>
        ) : (
          label
        )}
      </dt>
      <dd className="font-display text-lg font-600 text-matn">{value}</dd>
    </div>
  );
}

export function Message({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="mt-3 rounded-md border border-[#d9a4a4] bg-[#fdf2f2] px-3 py-2 text-xs text-[#8a2b2b] dark:bg-[#3a1f1f]">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="mt-3 rounded-md border border-chinni/40 bg-chinni/10 px-3 py-2 text-xs text-chinni-toq">
        {state.ok}
      </p>
    );
  }
  return null;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-tosh">{children}</p>;
}

/** Telefonda jadval gorizontal aylanadi, sahifa emas. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">{children}</div>;
}

export const th = 'py-2 pr-4 text-left text-xs font-500 text-tosh whitespace-nowrap';
export const td = 'py-2 pr-4 text-sm align-top';
/** Kalit–qiymat jadvalida qator sarlavhasi (`<th scope="row">`) — ko'rinishi oddiy katak kabi. */
export const thRow = `${td} text-left font-normal text-tosh`;

/**
 * Xato/ogohlantirish matni rangi. Tungi rejimda `color-scheme: dark` bo'ladi
 * (globals.css, ikkala yo'l ham), shuning uchun `light-dark()` mavzuga ergashadi.
 * globals.css ga `--xato` tokeni (`--color-xato`) qo'shilgach shunchaki
 * `text-xato` ga almashtiriladi — var() birinchi o'rinda shuning uchun.
 */
export const xato = 'text-[color:var(--xato,light-dark(#b3453f,#f28b82))]';
