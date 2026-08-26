'use client';

import { useActionState } from 'react';
import { addSynonymAction, deleteSynonymAction, importAction, loginAction, type ActionState } from './actions';

const EMPTY: ActionState = {};

function Message({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="mt-3 rounded-md border border-[#d9a4a4] bg-[#fdf2f2] px-3 py-2 text-xs text-[#8a2b2b]">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="mt-3 rounded-md border border-chinni/40 bg-chinni/8 px-3 py-2 text-xs text-chinni-toq">
        {state.ok}
      </p>
    );
  }
  return null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, EMPTY);
  return (
    <form action={action}>
      <label htmlFor="password" className="text-xs text-tosh">
        Parol
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="mt-1.5 w-full rounded-karta border border-chiziq bg-oq px-4 py-2.5 text-sm outline-none focus:border-chinni"
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-karta bg-chinni py-2.5 text-sm font-500 text-white transition-colors hover:bg-chinni-toq disabled:opacity-60"
      >
        {pending ? 'Tekshirilmoqda…' : 'Kirish'}
      </button>
      <Message state={state} />
    </form>
  );
}

function ImportForm() {
  const [state, action, pending] = useActionState(importAction, EMPTY);
  return (
    <form action={action}>
      <p className="text-xs text-tosh">
        Yangi oy faylini yuklang. Yangi yozuvlar qo&apos;shilgach eski batch o&apos;chiriladi —
        korxonalar saqlanib qoladi.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
        <div>
          <label htmlFor="file" className="text-xs text-tosh">
            Excel fayl (.xlsx)
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,.xls"
            required
            className="mt-1.5 w-full rounded-karta border border-chiziq bg-oq px-3 py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-qogoz file:px-3 file:py-1.5 file:text-xs"
          />
        </div>
        <div>
          <label htmlFor="batch" className="text-xs text-tosh">
            Batch nomi
          </label>
          <input
            id="batch"
            name="batch"
            type="text"
            placeholder="2026-08"
            className="mt-1.5 w-full rounded-karta border border-chiziq bg-oq px-3 py-2 text-sm outline-none focus:border-chinni"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-karta bg-chinni px-5 py-2.5 text-sm font-500 text-white transition-colors hover:bg-chinni-toq disabled:opacity-60"
      >
        {pending ? 'Yuklanmoqda… (bir necha daqiqa)' : 'Import qilish'}
      </button>
      <Message state={state} />
    </form>
  );
}

function SynonymForm({ synonyms }: { synonyms: { term: string; canonical: string }[] }) {
  const [state, action, pending] = useActionState(addSynonymAction, EMPTY);

  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label htmlFor="term" className="text-xs text-tosh">
            So&apos;rov (masalan: сторож)
          </label>
          <input
            id="term"
            name="term"
            required
            className="mt-1.5 w-full rounded-karta border border-chiziq bg-oq px-3 py-2 text-sm outline-none focus:border-chinni"
          />
        </div>
        <div className="min-w-40 flex-1">
          <label htmlFor="canonical" className="text-xs text-tosh">
            Mos so&apos;z (masalan: qorovul)
          </label>
          <input
            id="canonical"
            name="canonical"
            required
            className="mt-1.5 w-full rounded-karta border border-chiziq bg-oq px-3 py-2 text-sm outline-none focus:border-chinni"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-karta bg-chinni px-4 py-2 text-sm font-500 text-white transition-colors hover:bg-chinni-toq disabled:opacity-60"
        >
          Qo&apos;shish
        </button>
      </form>
      <Message state={state} />

      <p className="mt-5 text-xs text-tosh">
        Ikkala so&apos;z ham saqlashda normalize() dan o&apos;tkaziladi.
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {synonyms.map((s) => (
          <li key={s.term}>
            <form action={deleteSynonymAction} className="inline">
              <input type="hidden" name="term" value={s.term} />
              <button
                type="submit"
                title="O'chirish"
                className="flex items-center gap-1.5 rounded-full border border-chiziq bg-oq py-1 pl-3 pr-2 text-xs text-tosh transition-colors hover:border-[#d9a4a4] hover:text-[#8a2b2b]"
              >
                {s.term} → {s.canonical}
                <span aria-hidden className="text-sm leading-none">
                  ×
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminForms({ synonyms }: { synonyms: { term: string; canonical: string }[] }) {
  return (
    <>
      <section className="rounded-karta border border-chiziq bg-oq p-6">
        <h2 className="font-display text-base font-600">Oylik import</h2>
        <div className="mt-4">
          <ImportForm />
        </div>
      </section>

      <section className="rounded-karta border border-chiziq bg-oq p-6">
        <h2 className="font-display text-base font-600">Sinonimlar</h2>
        <div className="mt-4">
          <SynonymForm synonyms={synonyms} />
        </div>
      </section>
    </>
  );
}
