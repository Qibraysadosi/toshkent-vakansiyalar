/**
 * Oylik Excel bazasini Supabase'ga yuklash (PLAN.md §7).
 *
 *   npm run import -- data/vakansiyalar.xlsx          # bazaga yozadi
 *   npm run import:dry -- data/vakansiyalar.xlsx      # faqat hisobot
 *   npm run import -- fayl.xlsx --out data/out/clean.json
 *
 * Tartib (PLAN §7): companies upsert → yangi batch bilan vacancies insert →
 * eski batch o'chiriladi → import_history yoziladi. Shu tartibda sayt hech
 * qachon bo'sh jadval ko'rmaydi.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import * as XLSX from 'xlsx';
import { transformRows, type ImportReport } from '../src/lib/import-transform';
import { closePool, transaction } from '../src/lib/db';
import type { CompanyRow, VacancyRow } from '../src/lib/database.types';

loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

const CHUNK = 1000;

interface Args {
  file: string;
  dryRun: boolean;
  batch: string;
  out: string | null;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let dryRun = false;
  let batch = '';
  let out: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run' || a === '-n') dryRun = true;
    else if (a === '--batch') batch = argv[++i] ?? '';
    else if (a === '--out') out = argv[++i] ?? null;
    else if (a.startsWith('-')) throw new Error(`Noma'lum parametr: ${a}`);
    else positional.push(a);
  }

  if (!positional[0]) {
    throw new Error('Excel fayl yo\'li ko\'rsatilmagan.\n  npm run import -- data/vakansiyalar.xlsx');
  }
  return {
    file: positional[0],
    dryRun,
    batch: batch || new Date().toISOString().replace(/[:.]/g, '-'),
    out,
  };
}

function readSheet(file: string): { header: unknown[]; rows: unknown[][] } {
  const wb = XLSX.read(readFileSync(resolve(file)), { type: 'buffer', raw: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Excel faylda birorta ham sheet yo\'q.');

  const all = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: null,
  });
  if (all.length < 2) throw new Error('Faylda ma\'lumot qatorlari yo\'q.');
  return { header: all[0], rows: all.slice(1) };
}

function printReport(r: ImportReport, batch: string, dryRun: boolean) {
  const pad = (label: string, value: string | number) => `  ${label.padEnd(34, '.')} ${value}`;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`IMPORT HISOBOTI   batch: ${batch}${dryRun ? '   [DRY RUN — bazaga yozilmadi]' : ''}`);
  console.log('='.repeat(60));
  console.log(pad('Excel qatorlari', r.rowsRead));
  console.log(pad("O'tkazib yuborilgan", r.skipped));
  console.log(pad('Birlashtirilgan takrorlar', r.duplicatesMerged));
  console.log(pad('Bazaga yoziladigan vakansiya', r.rowsMerged));
  console.log(pad('Korxonalar (unikal STIR)', r.companies));
  console.log(pad('Tumanlar', r.districts));
  console.log('  ' + '-'.repeat(48));
  console.log(pad('Maosh: raqam bilan', r.salaryNumeric));
  console.log(pad('Maosh: shtat jadvali bo\'yicha', r.salaryScheduleNote));
  console.log(pad('Maosh: juda katta (>100 mln)', r.salaryTooHigh));
  console.log(pad('Maosh: juda kichik (<10 ming)', r.salaryTooLow));
  console.log('  ' + '-'.repeat(48));
  console.log(pad('Lavozim: kirill yozuvida', r.positionsCyrillic));
  console.log(pad('Lavozim: lotin yozuvida', r.positionsLatin));

  if (r.errors.length) {
    console.log(`\n  XATOLAR: ${r.errors.length} ta`);
    for (const e of r.errors.slice(0, 10)) {
      console.log(`   ${e.row}-qator: ${e.reason}${e.value ? ` (${e.value.slice(0, 60)})` : ''}`);
    }
    if (r.errors.length > 10) console.log(`   ... yana ${r.errors.length - 10} ta`);
  } else {
    console.log('\n  Xatolarsiz.');
  }
  console.log('='.repeat(60) + '\n');
}

/** Ko'p qatorli INSERT uchun $1,$2,... to'plamlarini yasaydi. */
function placeholders(rowCount: number, colCount: number, offset = 0): string {
  const groups: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    const cells: string[] = [];
    for (let c = 0; c < colCount; c++) cells.push(`$${offset + r * colCount + c + 1}`);
    groups.push(`(${cells.join(',')})`);
  }
  return groups.join(',');
}

async function writeToDatabase(
  companies: CompanyRow[],
  vacancies: Omit<VacancyRow, 'id' | 'views'>[],
  batch: string,
  report: ImportReport,
) {
  await transaction(async (client) => {
    // 1) companies — upsert. Boyitilgan ustunlar (official_name, address, ...)
    //    ustidan yozilmaydi, chunki ular INSERT ro'yxatida yo'q.
    console.log(`companies upsert: ${companies.length} ta...`);
    const COMPANY_COLS = ['stir', 'name', 'name_search', 'phone', 'district'] as const;
    for (let i = 0; i < companies.length; i += CHUNK) {
      const slice = companies.slice(i, i + CHUNK);
      const values = slice.flatMap((c) => COMPANY_COLS.map((k) => c[k]));
      await client.query(
        `insert into companies (${COMPANY_COLS.join(',')})
         values ${placeholders(slice.length, COMPANY_COLS.length)}
         on conflict (stir) do update set
           name = excluded.name,
           name_search = excluded.name_search,
           phone = excluded.phone,
           district = excluded.district`,
        values,
      );
      process.stdout.write(`  ${Math.min(i + CHUNK, companies.length)}/${companies.length}\r`);
    }
    console.log(`  ${companies.length}/${companies.length} tayyor.`);

    // 2) vacancies — yangi batch qo'shiladi (eski batch hali joyida turadi)
    console.log(`vacancies insert: ${vacancies.length} ta...`);
    const VACANCY_COLS = [
      'stir', 'district', 'department', 'position', 'position_search', 'posted_date',
      'stavka', 'salary', 'salary_note', 'education', 'quota', 'positions_count', 'import_batch',
    ] as const;
    for (let i = 0; i < vacancies.length; i += CHUNK) {
      const slice = vacancies.slice(i, i + CHUNK);
      const values = slice.flatMap((v) => VACANCY_COLS.map((k) => v[k]));
      await client.query(
        `insert into vacancies (${VACANCY_COLS.join(',')})
         values ${placeholders(slice.length, VACANCY_COLS.length)}`,
        values,
      );
      process.stdout.write(`  ${Math.min(i + CHUNK, vacancies.length)}/${vacancies.length}\r`);
    }
    console.log(`  ${vacancies.length}/${vacancies.length} tayyor.`);

    // 3) eski batchlarni o'chirish — to'liq almashtirish (PLAN §7)
    const del = await client.query('delete from vacancies where import_batch <> $1', [batch]);
    console.log(`eski vakansiyalar o'chirildi: ${del.rowCount ?? 0} ta`);

    // 4) import tarixi
    await client.query(
      `insert into import_history (batch, rows_read, rows_merged, errors)
       values ($1, $2, $3, $4)
       on conflict (batch) do update set
         rows_read = excluded.rows_read,
         rows_merged = excluded.rows_merged,
         errors = excluded.errors`,
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
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(`Fayl o'qilmoqda: ${args.file}`);
  const { header, rows } = readSheet(args.file);
  console.log(`  ${rows.length} qator, ${header.length} ustun.`);

  const { companies, vacancies, report } = transformRows(rows, header, args.batch);
  printReport(report, args.batch, args.dryRun);

  if (args.out) {
    mkdirSync(dirname(resolve(args.out)), { recursive: true });
    writeFileSync(resolve(args.out), JSON.stringify({ report, companies, vacancies }, null, 1));
    console.log(`Tozalangan ma'lumot yozildi: ${args.out}`);
  }

  if (args.dryRun) {
    console.log('Dry run — bazaga hech narsa yozilmadi.');
    return;
  }

  await writeToDatabase(companies, vacancies, args.batch, report);
  console.log(`\nImport tugadi. Batch: ${args.batch}`);
}

main()
  .catch((err: unknown) => {
    console.error(`\nXATO: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => closePool());
