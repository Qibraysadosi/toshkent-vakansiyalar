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

export function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <dd className="font-display text-lg font-600 text-matn">{value}</dd>
      <dt className="mt-0.5 text-xs text-tosh">{label}</dt>
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-karta border border-chiziq bg-yuza p-4 transition-colors hover:border-chinni">
      {body}
    </Link>
  ) : (
    <div className="rounded-karta border border-chiziq bg-yuza p-4">{body}</div>
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
