'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { isAdmin, signIn, signOut } from '@/lib/admin-auth';
import { clientIpFromHeaders, hitBucket } from '@/lib/rate-limit';
import { commitStaged, discardStaged, stageImport } from '@/lib/import-run';
import type { ImportReport } from '@/lib/import-transform';
import { CACHE_TAG, deleteSynonym, setVacancyHidden, upsertSynonym } from '@/lib/queries';
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

// Vercel Functions so'rov tanasini 4.5 MB dan yuqorida platforma darajasida
// (413) rad etadi — bizning tekshiruv unga yetguncha ishlashi uchun 4 MB.
// Kattaroq fayl uchun `npm run import` (skript bevosita bazaga yozadi).
// Xuddi shu chegara forms.tsx (mijoz tomonida) va next.config.ts da.
const MAX_UPLOAD_MB = 4;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Kirish urinishlari: 15 daqiqada IP uchun 5 ta, hammasi uchun 30 ta.
// Xotiradagi hisoblagich — Vercel'da har instans/sovuq start uchun alohida,
// shuning uchun bu faqat birinchi qatlam (qarang: rate-limit.ts izohi).
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_PER_IP = 5;
const LOGIN_GLOBAL = 30;

function revalidateAll() {
  revalidateTag(CACHE_TAG); // queries.ts dagi 1 soatlik so'rov keshi
  for (const p of ['/', '/vakansiyalar', '/statistika', '/admin', '/admin/import', '/admin/vakansiyalar', '/sitemap.xml']) {
    revalidatePath(p);
  }
}

/** So'rov keshini (queries.ts, 10 daqiqa) darhol tozalash — skript orqali importdan keyin. */
export async function clearCacheAction(): Promise<void> {
  if (!(await isAdmin())) return;
  revalidateAll();
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const password = String(form.get('password') ?? '');
  if (!password) return { error: 'Parol kiritilmadi.' };

  // Urinish `signIn` dan OLDIN sanaladi — to'g'ri topilgan parol ham hisobni chetlab o'tmasin.
  const ip = clientIpFromHeaders(await headers());
  const perIp = hitBucket(`login:${ip}`, LOGIN_PER_IP, LOGIN_WINDOW_MS);
  const global = hitBucket('login:*', LOGIN_GLOBAL, LOGIN_WINDOW_MS);
  if (perIp.limited || global.limited) {
    console.warn(`[admin] kirish cheklandi, ip=${ip}`);
    return { error: "Juda ko'p urinish. Bir necha daqiqadan so'ng qayta urinib ko'ring." };
  }

  const ok = await signIn(password);
  if (!ok) {
    console.warn(`[admin] noto'g'ri parol, ip=${ip}`);
    await new Promise((r) => setTimeout(r, 500)); // qo'pol kuch urinishlarini sekinlashtiradi
    return { error: "Parol noto'g'ri." };
  }
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
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `Fayl juda katta (${MAX_UPLOAD_MB} MB dan oshmasin — Vercel chegarasi). Kattaroq fayl uchun \`npm run import\` ishlating.` };
  }
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
        `${result.deleted} ta eski yozuv o'chirildi (${result.scope.length} ta tuman ichida). Batch: ${result.batch}.`,
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
  revalidateTag(CACHE_TAG);
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
    if (r.sent === 0 && r.skipped === 0 && r.failed === 0 && r.remaining === 0) {
      return { ok: "Bu batch uchun hamma obunachi ko'rib chiqilgan (yoki faol obunachi yo'q)." };
    }
    return {
      ok:
        `Yuborildi: ${r.sent} ta, mos vakansiya topilmagani: ${r.skipped} ta, xato: ${r.failed} ta.` +
        (r.remaining > 0 ? ` Yana ${r.remaining} ta obunachi qoldi — tugmani qayta bosing.` : ''),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
