'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin, signIn, signOut } from '@/lib/admin-auth';
import { commitStaged, discardStaged, stageImport } from '@/lib/import-run';
import type { ImportReport } from '@/lib/import-transform';
import { deleteSynonym, setVacancyHidden, upsertSynonym } from '@/lib/queries';
import { sendNotifications } from '@/lib/notify';

export interface ActionState {
  ok?: string;
  error?: string;
}

export interface ImportPreviewState extends ActionState {
  token?: string;
  batch?: string;
  report?: ImportReport;
  done?: boolean;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function revalidateAll() {
  for (const p of ['/', '/vakansiyalar', '/statistika', '/admin', '/admin/import', '/admin/vakansiyalar', '/sitemap.xml']) {
    revalidatePath(p);
  }
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const password = String(form.get('password') ?? '');
  if (!password) return { error: 'Parol kiritilmadi.' };
  const ok = await signIn(password);
  if (!ok) return { error: "Parol noto'g'ri." };
  revalidatePath('/admin');
  return { ok: 'Kirdingiz.' };
}

export async function logoutAction(): Promise<void> {
  await signOut();
  revalidatePath('/admin');
}

// ---------------------------------------------------------------------------
// Import — ikki bosqich: oldindan ko'rish → tasdiqlash
// ---------------------------------------------------------------------------

export async function previewImportAction(_prev: ImportPreviewState, form: FormData): Promise<ImportPreviewState> {
  if (!(await isAdmin())) return { error: "Ruxsat yo'q." };

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Fayl tanlanmadi.' };
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Fayl juda katta (25 MB dan oshmasin).' };
  if (!/\.xlsx?$/i.test(file.name)) return { error: 'Faqat .xlsx fayl qabul qilinadi.' };

  const batch = String(form.get('batch') ?? '').trim() || new Date().toISOString().slice(0, 7);

  try {
    const staged = await stageImport(Buffer.from(await file.arrayBuffer()), batch);
    return { token: staged.token, batch: staged.batch, report: staged.report };
  } catch (err) {
    return { error: `Faylni o'qib bo'lmadi: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function confirmImportAction(_prev: ImportPreviewState, form: FormData): Promise<ImportPreviewState> {
  if (!(await isAdmin())) return { error: "Ruxsat yo'q." };
  const token = String(form.get('token') ?? '');
  if (!token) return { error: 'Yuklama topilmadi.' };

  try {
    const result = await commitStaged(token);
    revalidateAll();
    return {
      done: true,
      batch: result.batch,
      report: result.report,
      ok:
        `Import tugadi: ${result.report.rowsMerged} ta yozuv saqlandi, ` +
        `${result.deleted} ta eski yozuv o'chirildi. Batch: ${result.batch}.`,
    };
  } catch (err) {
    return { error: `Bazaga yozishda xato: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function discardImportAction(_prev: ImportPreviewState, form: FormData): Promise<ImportPreviewState> {
  if (!(await isAdmin())) return { error: "Ruxsat yo'q." };
  const token = String(form.get('token') ?? '');
  if (token) await discardStaged(token);
  return {};
}

// ---------------------------------------------------------------------------
// Sinonimlar
// ---------------------------------------------------------------------------

export async function addSynonymAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { error: "Ruxsat yo'q." };
  const term = String(form.get('term') ?? '').trim();
  const canonical = String(form.get('canonical') ?? '').trim();
  if (!term || !canonical) return { error: "Ikkala maydon ham to'ldirilishi kerak." };
  await upsertSynonym(term, canonical);
  revalidatePath('/admin/sinonimlar');
  revalidatePath('/admin/loglar');
  return { ok: `«${term}» → «${canonical}» saqlandi.` };
}

export async function deleteSynonymAction(form: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const term = String(form.get('term') ?? '');
  if (term) await deleteSynonym(term);
  revalidatePath('/admin/sinonimlar');
}

// ---------------------------------------------------------------------------
// Vakansiyani yashirish / ochish
// ---------------------------------------------------------------------------

export async function setHiddenAction(form: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = Number(form.get('id'));
  const hidden = String(form.get('hidden')) === '1';
  if (!Number.isInteger(id) || id <= 0) return;
  await setVacancyHidden(id, hidden);
  revalidatePath('/admin/vakansiyalar');
  revalidatePath(`/vakansiya/${id}`);
  revalidatePath('/vakansiyalar');
  revalidatePath('/');
}

// ---------------------------------------------------------------------------
// Telegram bildirishnomalari
// ---------------------------------------------------------------------------

export async function notifyAction(_prev: ActionState, _form: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { error: "Ruxsat yo'q." };
  try {
    const r = await sendNotifications();
    revalidatePath('/admin/obunachilar');
    if (r.sent === 0 && r.skipped === 0) return { ok: 'Faol obunachi yo‘q.' };
    return { ok: `Yuborildi: ${r.sent} ta, mos vakansiya topilmagani: ${r.skipped} ta, xato: ${r.failed} ta.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
