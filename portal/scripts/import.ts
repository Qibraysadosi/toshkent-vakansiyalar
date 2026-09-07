/**
 * Oylik Excel bazasini yuklash (PLAN.md §7).
 *
 *   npm run import -- data/vakansiyalar.xlsx          # bazaga yozadi
 *   npm run import:dry -- data/vakansiyalar.xlsx      # faqat hisobot
 *   npm run import -- fayl.xlsx --batch 2026-08 --out data/out/clean.json
 *
 * Admin paneldagi yuklash bilan BIR XIL kod (`src/lib/import-run.ts`):
 * companies upsert → yangi batch bilan vacancies insert → eski batch
 * o'chiriladi → import_history. Shu tartibda sayt hech qachon bo'sh jadval
 * ko'rmaydi.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { transformRows, type ImportReport } from '../src/lib/import-transform';
import { parseWorkbook, writeImport } from '../src/lib/import-run';
import { closePool, transaction } from '../src/lib/db';

loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

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
    throw new Error("Excel fayl yo'li ko'rsatilmagan.\n  npm run import -- data/vakansiyalar.xlsx");
  }
  return {
    file: positional[0],
    dryRun,
    batch: batch || new Date().toISOString().slice(0, 7),
    out,
  };
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
  console.log(pad("Maosh: shtat jadvali bo'yicha", r.salaryScheduleNote));
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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(`Fayl o'qilmoqda: ${args.file}`);
  const { header, rows } = parseWorkbook(readFileSync(resolve(args.file)));
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
  if (vacancies.length === 0) throw new Error('Bironta ham yaroqli qator yo‘q — import bekor qilindi.');

  const { deleted } = await transaction((client) =>
    writeImport(client, companies, vacancies, args.batch, report, (msg) => process.stdout.write(`  ${msg}\r`)),
  );
  console.log(`\nEski vakansiyalar o'chirildi: ${deleted} ta`);
  console.log(`Import tugadi. Batch: ${args.batch}`);
}

main()
  .catch((err: unknown) => {
    console.error(`\nXATO: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => closePool());
