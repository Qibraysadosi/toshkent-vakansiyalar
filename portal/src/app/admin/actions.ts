'use server';

import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { isAdmin, signIn, signOut } from '@/lib/admin-auth';
import { transformRows } from '@/lib/import-transform';
import { deleteSynonym, upsertSynonym } from '@/lib/queries';
import { transaction } from '@/lib/db';
import type { CompanyRow, VacancyRow } from '@/lib/database.types';

export interface ActionState {
  ok?: string;
  error?: string;
}

const CHUNK = 1000;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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

export async function addSynonymAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { error: 'Ruxsat yo\'q.' };
  const term = String(form.get('term') ?? '').trim();
  const canonical = String(form.get('canonical') ?? '').trim();
  if (!term || !canonical) return { error: "Ikkala maydon ham to'ldirilishi kerak." };

  await upsertSynonym(term, canonical);
  revalidatePath('/admin');
  return { ok: `«${term}» → «${canonical}» saqlandi.` };
}

export async function deleteSynonymAction(form: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const term = String(form.get('term') ?? '');
  if (term) await deleteSynonym(term);
  revalidatePath('/admin');
}

/** PLAN §7 — admin paneldan .xlsx yuklab, oylik bazani almashtirish. */
export async function importAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { error: "Ruxsat yo'q." };

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Fayl tanlanmadi.' };
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Fayl juda katta (25 MB dan oshmasin).' };
  if (!/\.xlsx?$/i.test(file.name)) return { error: 'Faqat .xlsx fayl qabul qilinadi.' };

  const batch = String(form.get('batch') ?? '').trim() || new Date().toISOString().slice(0, 10);

  let companies: CompanyRow[];
  let vacancies: Omit<VacancyRow, 'id' | 'views'>[];
  let report: ReturnType<typeof transformRows>['report'];

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer', raw: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { error: "Faylda sheet yo'q." };

    // DIQQAT: `header: 1` (massiv rejimi) ataylab ishlatiladi — sarlavhalardan
    // obyekt kaliti yasalmaydi, ya'ni xlsx@0.18.5 dagi prototype-pollution
    // yo'li (CVE-2023-30533) ochilmaydi.
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
    });
    if (rows.length < 2) return { error: "Faylda ma'lumot qatorlari yo'q." };

    const result = transformRows(rows.slice(1), rows[0], batch);
    companies = result.companies;
    vacancies = result.vacancies;
    report = result.report;
  } catch (err) {
    return { error: `Faylni o'qib bo'lmadi: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (vacancies.length === 0) return { error: 'Bironta ham yaroqli qator topilmadi — import bekor qilindi.' };

  try {
    await transaction(async (client) => {
      const companyCols = ['stir', 'name', 'name_search', 'phone', 'district'] as const;
      for (let i = 0; i < companies.length; i += CHUNK) {
        const slice = companies.slice(i, i + CHUNK);
        const values = slice.flatMap((c) => companyCols.map((k) => c[k]));
        const ph = slice
          .map((_, r) => `(${companyCols.map((__, c) => `$${r * companyCols.length + c + 1}`).join(',')})`)
          .join(',');
        await client.query(
          `insert into companies (${companyCols.join(',')}) values ${ph}
           on conflict (stir) do update set name = excluded.name, name_search = excluded.name_search,
             phone = excluded.phone, district = excluded.district`,
          values,
        );
      }

      const vacancyCols = [
        'stir', 'district', 'department', 'position', 'position_search', 'posted_date',
        'stavka', 'salary', 'salary_note', 'education', 'quota', 'positions_count', 'import_batch',
      ] as const;
      for (let i = 0; i < vacancies.length; i += CHUNK) {
        const slice = vacancies.slice(i, i + CHUNK);
        const values = slice.flatMap((v) => vacancyCols.map((k) => v[k]));
        const ph = slice
          .map((_, r) => `(${vacancyCols.map((__, c) => `$${r * vacancyCols.length + c + 1}`).join(',')})`)
          .join(',');
        await client.query(`insert into vacancies (${vacancyCols.join(',')}) values ${ph}`, values);
      }

      await client.query('delete from vacancies where import_batch <> $1', [batch]);

      await client.query(
        `insert into import_history (batch, rows_read, rows_merged, errors) values ($1,$2,$3,$4)
         on conflict (batch) do update set rows_read = excluded.rows_read,
           rows_merged = excluded.rows_merged, errors = excluded.errors`,
        [
          batch,
          report.rowsRead,
          report.rowsMerged,
          JSON.stringify({
            skipped: report.skipped,
            duplicatesMerged: report.duplicatesMerged,
            companies: report.companies,
            salaryNumeric: report.salaryNumeric,
            salaryScheduleNote: report.salaryScheduleNote,
            salaryTooHigh: report.salaryTooHigh,
            salaryTooLow: report.salaryTooLow,
            rows: report.errors.slice(0, 500),
          }),
        ],
      );
    });
  } catch (err) {
    return { error: `Bazaga yozishda xato: ${err instanceof Error ? err.message : String(err)}` };
  }

  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/vakansiyalar');
  revalidatePath('/statistika');

  return {
    ok:
      `Import tugadi. ${report.rowsRead} qator o'qildi, ${report.rowsMerged} ta yozuv saqlandi ` +
      `(${report.duplicatesMerged} takror birlashtirildi), ${report.companies} korxona. ` +
      `Xatolar: ${report.errors.length}.`,
  };
}
