'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { xato } from './ui';
import {
  addSynonymAction,
  confirmImportAction,
  deleteSynonymAction,
  discardImportAction,
  loginAction,
  notifyAction,
  previewImportAction,
  setHiddenAction,
  type ActionState,
  type ImportPreviewState,
} from './actions';

const EMPTY: ActionState = {};
// actions.ts dagi MAX_UPLOAD_MB bilan bir xil (Vercel 4.5 MB so'rov chegarasi).
const MAX_UPLOAD_MB = 4;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const nf = new Intl.NumberFormat('ru-RU');
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : nf.format(n).replace(/ /g, ' '));

function Message({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="mt-3 rounded-md border border-[#d9a4a4] bg-[#fdf2f2] px-3 py-2 text-xs text-[#8a2b2b]">
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

const input =
  'mt-1.5 w-full rounded-karta border border-chiziq bg-yuza px-3 py-2 text-sm text-matn outline-none focus:border-chinni';
const primary =
  'rounded-karta bg-chinni px-5 py-2.5 text-sm font-500 text-chinni-ustida transition-colors hover:bg-chinni-toq disabled:opacity-60';
const secondary =
  'rounded-karta border border-chiziq px-5 py-2.5 text-sm text-tosh transition-colors hover:border-chinni hover:text-chinni disabled:opacity-60';

// ---------------------------------------------------------------------------

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, EMPTY);
  return (
    <form action={action}>
      <label htmlFor="password" className="text-xs text-tosh">
        Parol
      </label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      <button type="submit" disabled={pending} className={`${primary} mt-4 w-full`}>
        {pending ? 'Tekshirilmoqda…' : 'Kirish'}
      </button>
      <Message state={state} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Import: 1) fayl → oldindan ko'rish  2) tasdiqlash / bekor qilish
// ---------------------------------------------------------------------------

function ReportTable({ r }: { r: NonNullable<ImportPreviewState['report']> }) {
  const rows: [string, string, string?][] = [
    ['Excel qatorlari', fmt(r.rowsRead)],
    ["O'tkazib yuborilgan", fmt(r.skipped), r.skipped ? 'xato' : undefined],
    ['Birlashtirilgan takrorlar', fmt(r.duplicatesMerged)],
    ['Bazaga yoziladigan vakansiya', fmt(r.rowsMerged), 'kuchli'],
    ['Korxonalar', fmt(r.companies)],
    ['Tumanlar', fmt(r.districts), r.districts !== 12 ? 'xato' : undefined],
    ['Maosh: raqam bilan', fmt(r.salaryNumeric)],
    ["Maosh: shtat jadvali bo'yicha", fmt(r.salaryScheduleNote)],
    ['Maosh: >100 mln (rad etildi)', fmt(r.salaryTooHigh)],
    ['Maosh: <10 ming (rad etildi)', fmt(r.salaryTooLow)],
    ['Lavozim: kirill / lotin', `${fmt(r.positionsCyrillic)} / ${fmt(r.positionsLatin)}`],
  ];
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([k, v, tone]) => (
          <tr key={k} className="border-b border-chiziq last:border-0">
            <th scope="row" className="py-1.5 pr-4 text-left font-normal text-tosh">
              {k}
            </th>
            <td className={`raqam py-1.5 text-right ${tone === 'xato' ? xato : tone === 'kuchli' ? 'text-chinni' : ''}`}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ImportWizard({ lastBatch }: { lastBatch: string | null }) {
  const [preview, previewAction, previewing] = useActionState(previewImportAction, {} as ImportPreviewState);
  const [confirm, confirmAction, confirming] = useActionState(confirmImportAction, {} as ImportPreviewState);
  const [, discardAction, discarding] = useActionState(discardImportAction, {} as ImportPreviewState);
  // Mijoz tomonidagi hajm tekshiruvi: Vercel 4.5 MB dan katta so'rovni action'gacha
  // yetkazmay 413 qaytaradi — shuning uchun xabarni yuborishdan OLDIN ko'rsatamiz.
  const [sizeError, setSizeError] = useState<string | null>(null);

  // Tasdiqlangan → yakuniy xabar
  if (confirm.done) {
    return (
      <div>
        <Message state={confirm} />
        {confirm.report && (
          <div className="mt-4">
            <ReportTable r={confirm.report} />
          </div>
        )}
        <a href="/admin/import" className={`${secondary} mt-5 inline-block`}>
          Yangi import
        </a>
      </div>
    );
  }

  // Oldindan ko'rish tayyor → tasdiqlash bosqichi
  if (preview.token && preview.report) {
    const r = preview.report;
    const risky = r.skipped > r.rowsRead * 0.05 || r.districts !== 12;
    return (
      <div>
        <p className="text-sm">
          Batch: <span className="raqam">{preview.batch}</span>. Bazaga hali <b>hech narsa yozilmadi</b> —
          hisobotni tekshirib, tasdiqlang.
        </p>
        {risky && (
          <p className="mt-3 rounded-md border border-quyosh/50 bg-quyosh/10 px-3 py-2 text-xs text-quyosh-matn">
            Diqqat: fayl kutilganidan farq qiladi (ko&apos;p o&apos;tkazib yuborilgan qator yoki 12 ta tuman emas).
            Ustunlar joyi o&apos;zgarmaganini tekshiring.
          </p>
        )}
        <div className="mt-4">
          <ReportTable r={r} />
        </div>
        {r.errors.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-tosh hover:text-chinni">
              Xatolar: {r.errors.length} ta
            </summary>
            <ul className="mt-2 max-h-48 overflow-y-auto text-xs text-tosh">
              {r.errors.slice(0, 50).map((e, i) => (
                <li key={i}>
                  {e.row}-qator: {e.reason}
                  {e.value ? ` (${e.value.slice(0, 60)})` : ''}
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <form action={confirmAction}>
            <input type="hidden" name="token" value={preview.token} />
            <button type="submit" disabled={confirming || discarding} className={primary}>
              {confirming ? 'Yozilmoqda… (bir necha soniya)' : `Tasdiqlash — ${fmt(r.rowsMerged)} ta yozuv`}
            </button>
          </form>
          <form
            action={discardAction}
            onSubmit={() => {
              // Bekor qilingach sahifani toza holatga qaytaramiz
              setTimeout(() => window.location.reload(), 300);
            }}
          >
            <input type="hidden" name="token" value={preview.token} />
            <button type="submit" disabled={confirming || discarding} className={secondary}>
              Bekor qilish
            </button>
          </form>
        </div>
        <Message state={confirm} />
      </div>
    );
  }

  // Boshlang'ich: fayl tanlash
  const suggested = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  return (
    <form
      action={previewAction}
      onSubmit={(e) => {
        const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement | null)?.files?.[0];
        if (file && file.size > MAX_UPLOAD_BYTES) {
          e.preventDefault();
          setSizeError(
            `Fayl juda katta (${(file.size / 1024 / 1024).toFixed(1)} MB; ${MAX_UPLOAD_MB} MB dan oshmasin — Vercel chegarasi). ` +
              'Kattaroq fayl uchun `npm run import` ishlating.',
          );
        } else {
          setSizeError(null);
        }
      }}
    >
      <p className="text-xs text-tosh">
        Fayl avval tozalanib hisobot ko&apos;rsatiladi; bazaga faqat siz tasdiqlagandan keyin yoziladi.
        {lastBatch && (
          <>
            {' '}
            Oxirgi import: <span className="raqam">{lastBatch}</span>.
          </>
        )}
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
            className={`${input} file:mr-3 file:rounded file:border-0 file:bg-fon file:px-3 file:py-1.5 file:text-xs file:text-matn`}
          />
        </div>
        <div>
          <label htmlFor="batch" className="text-xs text-tosh">
            Batch nomi
          </label>
          <input id="batch" name="batch" type="text" defaultValue={suggested} className={input} />
        </div>
      </div>
      <button type="submit" disabled={previewing} className={`${primary} mt-4`}>
        {previewing ? "O'qilmoqda…" : "Oldindan ko'rish"}
      </button>
      <Message state={sizeError ? { error: sizeError } : preview} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sinonimlar
// ---------------------------------------------------------------------------

export function SynonymForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(addSynonymAction, EMPTY);
  const prefill = params.get('term') ?? '';

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-40 flex-1">
        <label htmlFor="term" className="text-xs text-tosh">
          So&apos;rov (masalan: сторож)
        </label>
        <input id="term" name="term" required defaultValue={prefill} className={input} autoFocus={Boolean(prefill)} />
      </div>
      <div className="min-w-40 flex-1">
        <label htmlFor="canonical" className="text-xs text-tosh">
          Mos so&apos;z (masalan: qorovul)
        </label>
        <input id="canonical" name="canonical" required className={input} />
      </div>
      <button type="submit" disabled={pending} className={primary}>
        Qo&apos;shish
      </button>
      <div className="basis-full">
        <Message state={state} />
      </div>
    </form>
  );
}

export function SynonymChip({ term, canonical }: { term: string; canonical: string }) {
  return (
    <form action={deleteSynonymAction} className="inline">
      <input type="hidden" name="term" value={term} />
      <button
        type="submit"
        title="O'chirish"
        className="flex items-center gap-1.5 rounded-full border border-chiziq bg-yuza py-1 pl-3 pr-2 text-xs text-tosh transition-colors hover:border-[#d9a4a4] hover:text-[#b3453f]"
      >
        {term} → {canonical}
        <span className="sr-only">O&apos;chirish</span>
        <span aria-hidden className="text-sm leading-none">×</span>
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Vakansiyani yashirish
// ---------------------------------------------------------------------------

export function HideToggle({ id, hidden }: { id: number; hidden: boolean }) {
  return (
    <form action={setHiddenAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="hidden" value={hidden ? '0' : '1'} />
      <button
        type="submit"
        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
          hidden
            ? 'border-chinni text-chinni hover:bg-chinni hover:text-chinni-ustida'
            : 'border-chiziq text-tosh hover:border-[#d9a4a4] hover:text-[#b3453f]'
        }`}
      >
        {hidden ? 'Qayta ochish' : 'Yashirish'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Telegram
// ---------------------------------------------------------------------------

export function NotifyButton({ enabled, active }: { enabled: boolean; active: number }) {
  const [state, action, pending] = useActionState(notifyAction, EMPTY);
  return (
    <form action={action}>
      <button type="submit" disabled={!enabled || pending || active === 0} className={primary}>
        {pending ? 'Yuborilmoqda…' : `Bildirishnoma yuborish (${active} obunachi)`}
      </button>
      {!enabled && <p className="mt-2 text-xs text-tosh">TG_BOT_TOKEN o&apos;rnatilmagan.</p>}
      <Message state={state} />
    </form>
  );
}
