import { randomBytes } from 'node:crypto';
import * as XLSX from 'xlsx';
import { transformRows, type ImportReport } from './import-transform';
import { query, queryOne, transaction } from './db';
import type { CompanyRow, VacancyRow } from './database.types';
import type { PoolClient } from 'pg';

/**
 * Import mexanizmi — skript (`scripts/import.ts`) va admin panel BIR XIL
 * kodni ishlatadi. Ikki bosqich:
 *   1) `stageImport`   — faylni o'qib tozalaydi, natijani `import_staging` ga
 *                        yozadi, hisobot qaytaradi (bazaga tegilmaydi).
 *   2) `commitStaged`  — admin tasdiqlagach bazaga o'tkazadi (PLAN §7 tartibi).
 * Skript ikkalasini ketma-ket chaqiradi.
 */

const CHUNK = 1000;
// first_batch ixtiyoriy: deploydan oldin `import_staging` ga yozilgan payloadlarda
// yo'q — o'shanda import_batch olinadi (ikkalasi ham shu importning nomi).
type VacancyInsert = Omit<VacancyRow, 'id' | 'views' | 'is_hidden'> & { first_batch?: string };

export interface StagedImport {
  token: string;
  batch: string;
  report: ImportReport;
  companies: number;
  vacancies: number;
}

export function parseWorkbook(buffer: Buffer): { header: unknown[]; rows: unknown[][] } {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Excel faylda birorta ham sheet yo'q.");
  // DIQQAT: `header: 1` (massiv rejimi) — sarlavhalardan obyekt kaliti
  // yasalmaydi, ya'ni xlsx@0.18.5 dagi prototype-pollution yo'li ochilmaydi.
  const all = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, raw: true, defval: null });
  if (all.length < 2) throw new Error("Faylda ma'lumot qatorlari yo'q.");
  return { header: all[0], rows: all.slice(1) };
}

export async function stageImport(buffer: Buffer, batch: string): Promise<StagedImport> {
  const { header, rows } = parseWorkbook(buffer);
  const { companies, vacancies, report } = transformRows(rows, header, batch);
  if (vacancies.length === 0) throw new Error("Bironta ham yaroqli qator topilmadi — import bekor qilindi.");

  const token = randomBytes(16).toString('hex');
  // Eski, tasdiqlanmagan yuklamalarni tozalab turamiz
  await query("delete from import_staging where created_at < now() - interval '1 day'");
  await query(
    'insert into import_staging (token, batch, payload, report) values ($1, $2, $3, $4)',
    [token, batch, JSON.stringify({ companies, vacancies }), JSON.stringify(report)],
  );
  return { token, batch, report, companies: companies.length, vacancies: vacancies.length };
}

export async function getStaged(token: string): Promise<{ batch: string; report: ImportReport } | null> {
  const row = await queryOne<{ batch: string; report: ImportReport }>(
    'select batch, report from import_staging where token = $1',
    [token],
  );
  return row;
}

export async function discardStaged(token: string): Promise<void> {
  await query('delete from import_staging where token = $1', [token]);
}

function placeholders(rowCount: number, colCount: number): string {
  const groups: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    const cells: string[] = [];
    for (let c = 0; c < colCount; c++) cells.push(`$${r * colCount + c + 1}`);
    groups.push(`(${cells.join(',')})`);
  }
  return groups.join(',');
}

const COMPANY_COLS = ['stir', 'name', 'name_search', 'phone', 'district'] as const;
const VACANCY_COLS = [
  'stir', 'district', 'department', 'position', 'position_search', 'posted_date',
  'stavka', 'salary', 'salary_note', 'education', 'quota', 'positions_count', 'import_batch',
  'first_batch', 'fingerprint',
] as const;

function vacancyValue(v: VacancyInsert, col: (typeof VACANCY_COLS)[number]): unknown {
  return col === 'first_batch' ? (v.first_batch ?? v.import_batch) : v[col];
}

export async function writeImport(
  client: PoolClient,
  companies: CompanyRow[],
  vacancies: VacancyInsert[],
  batch: string,
  report: ImportReport,
  onProgress?: (msg: string) => void,
): Promise<{ deleted: number }> {
  // 1) companies — upsert. Boyitilgan ustunlar INSERT ro'yxatida yo'q, saqlanadi.
  for (let i = 0; i < companies.length; i += CHUNK) {
    const slice = companies.slice(i, i + CHUNK);
    await client.query(
      `insert into companies (${COMPANY_COLS.join(',')})
       values ${placeholders(slice.length, COMPANY_COLS.length)}
       on conflict (stir) do update set
         name = excluded.name, name_search = excluded.name_search,
         phone = excluded.phone, district = excluded.district`,
      slice.flatMap((c) => COMPANY_COLS.map((k) => c[k])),
    );
    onProgress?.(`companies ${Math.min(i + CHUNK, companies.length)}/${companies.length}`);
  }

  // 2) vacancies — fingerprint bo'yicha upsert: o'tgan oydan qolgan vakansiya
  //    o'z id'sini, ko'rishlar sonini va "yashirilgan" holatini saqlab qoladi;
  //    faqat sana, o'rin soni va batch yangilanadi. Yangilari qo'shiladi.
  //    `first_batch` DO UPDATE ro'yxatida YO'Q — faqat INSERT'da yoziladi,
  //    Telegram bildirishnomasi "yangi"ni shu ustundan aniqlaydi.
  //    Tegilgan id'lar yig'iladi — 3-qadamda faqat ular qoladi.
  const touched: number[] = [];
  for (let i = 0; i < vacancies.length; i += CHUNK) {
    const slice = vacancies.slice(i, i + CHUNK);
    const res = await client.query<{ id: number }>(
      `insert into vacancies (${VACANCY_COLS.join(',')})
       values ${placeholders(slice.length, VACANCY_COLS.length)}
       on conflict (fingerprint) do update set
         posted_date = excluded.posted_date,
         positions_count = excluded.positions_count,
         position_search = excluded.position_search,
         import_batch = excluded.import_batch
       returning id`,
      slice.flatMap((v) => VACANCY_COLS.map((k) => vacancyValue(v, k))),
    );
    for (const r of res.rows) touched.push(Number(r.id));
    onProgress?.(`vacancies ${Math.min(i + CHUNK, vacancies.length)}/${vacancies.length}`);
  }

  // 3) Yangi faylda yo'q vakansiyalar o'chadi (PLAN §7 — to'liq almashtirish).
  //    Batch nomiga emas, aynan shu importda tegilgan id'larga qaraladi —
  //    bir xil nom bilan qayta yuklansa ham eskirgan yozuv qolib ketmaydi.
  const del = await client.query('delete from vacancies where not (id = any($1::bigint[]))', [touched]);

  // 4) tarix
  await client.query(
    `insert into import_history (batch, rows_read, rows_merged, errors) values ($1,$2,$3,$4)
     on conflict (batch) do update set rows_read = excluded.rows_read,
       rows_merged = excluded.rows_merged, errors = excluded.errors, created_at = now()`,
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

  return { deleted: del.rowCount ?? 0 };
}

export async function commitStaged(token: string): Promise<{ batch: string; report: ImportReport; deleted: number }> {
  const row = await queryOne<{ batch: string; payload: { companies: CompanyRow[]; vacancies: VacancyInsert[] }; report: ImportReport }>(
    'select batch, payload, report from import_staging where token = $1',
    [token],
  );
  if (!row) throw new Error("Yuklama topilmadi yoki muddati o'tgan — faylni qaytadan yuklang.");

  const { deleted } = await transaction((client) =>
    writeImport(client, row.payload.companies, row.payload.vacancies, row.batch, row.report),
  );
  await discardStaged(token);
  return { batch: row.batch, report: row.report, deleted };
}
