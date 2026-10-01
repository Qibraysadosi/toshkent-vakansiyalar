/**
 * Baza sxemasini qo'llash / qayta yaratish — `psql` va shell'ga bog'liq emas.
 *
 *   npm run db:schema    # supabase/schema.sql ni qo'llaydi (idempotent)
 *   npm run db:reset     # barcha jadvallarni o'chirib, sxemani qaytadan qo'llaydi
 *
 * Nega skript: `psql "$DATABASE_URL"` npm skriptida ishlamaydi — npm
 * `.env.local` ni o'qimaydi (o'zgaruvchi bo'sh qoladi, psql lokal socket'ga
 * uriladi), Windows `cmd.exe` da esa `$DATABASE_URL` umuman kengaymaydi.
 * Bu skript `.env.local` ni o'zi o'qiydi va sxemani `pg` orqali yuboradi —
 * fayl oddiy SQL (`do $$ ... $$` bloklari bilan), parametrsiz so'rovda `pg`
 * ko'p buyruqli matnni bitta so'rov sifatida bajaradi.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { closePool, getPool } from '../src/lib/db';

loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

const SCHEMA_FILE = resolve('supabase/schema.sql');

/**
 * `db:reset` o'chiradigan jadvallar — schema.sql dagi BARCHA `create table`
 * lar. Ro'yxat to'liq bo'lmasa (masalan `import_staging` tushib qolsa)
 * "reset" dan keyin eski qatorlar (tasdiqlanmagan import payloadlari) qolib,
 * yangi bazaga yozilib ketishi mumkin.
 */
const TABLES = [
  'vacancies',
  'companies',
  'synonyms',
  'search_logs',
  'subscriptions',
  'import_history',
  'import_staging',
];

async function applySchema(): Promise<void> {
  const sql = readFileSync(SCHEMA_FILE, 'utf8');
  process.stdout.write(`Sxema qo'llanmoqda: ${SCHEMA_FILE} ... `);
  await getPool().query(sql);
  console.log('tayyor.');
}

async function reset(): Promise<void> {
  // Jadval nomlari shu fayldagi doimiy ro'yxatdan — foydalanuvchi kiritmaydi.
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  process.stdout.write(`Jadvallar o'chirilmoqda (${TABLES.join(', ')}) ... `);
  await getPool().query(`drop table if exists ${list} cascade`);
  console.log('tayyor.');
  await applySchema();
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === 'schema') return applySchema();
  if (cmd === 'reset') return reset();
  throw new Error("Buyruq ko'rsatilmagan: `tsx scripts/db.ts schema` yoki `tsx scripts/db.ts reset`.");
}

main()
  .catch((err: unknown) => {
    console.error(`\nXATO: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => closePool());
