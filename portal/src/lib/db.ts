import pg, { Pool, type PoolClient, type QueryResultRow } from 'pg';

/*
 * `pg` standart sozlamalari ikkita muammo beradi, ikkalasi ham shu yerda hal
 * qilinadi (drayver global sozlamasi — bir marta o'rnatiladi):
 *
 *  1. int8 (bigserial `id`) STRING bo'lib keladi — 2^53 dan katta bo'lishi
 *     mumkinligi uchun. Bizda id'lar millionlarda, xavfsiz raqamga o'giramiz.
 *  2. date ustuni JS `Date` ga aylanadi va LOKAL vaqt zonasida talqin qilinib,
 *     sana bir kunga siljib ketadi. Xom "YYYY-MM-DD" satrini saqlaymiz.
 */
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => Number(value));
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value);

/**
 * Postgres ulanishi — bitta `DATABASE_URL` bilan ham lokal Postgres, ham
 * Supabase ishlaydi (Supabase → Settings → Database → Connection string).
 *
 * Nega supabase-js emas: qidiruv `similarity()`, `unaccent`-ga o'xshash
 * trigram reytingi va autocomplete uchun guruhlash kerak — bularni PostgREST
 * orqali qilib bo'lmaydi. RLS siyosatlari `schema.sql` da qoladi: ular ochiq
 * PostgREST endpointini himoya qiladi, sayt esa server tomondan SQL yozadi.
 */

declare global {
  // eslint-disable-next-line no-var
  var __vakansiyaPool: Pool | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL o\'rnatilmagan. `.env.example` dan `.env.local` yarating.\n' +
        '  Lokal:    postgresql://vak:vak@127.0.0.1:5432/vakansiyalar\n' +
        '  Supabase: Settings -> Database -> Connection string (URI)',
    );
  }
  return url;
}

/**
 * Dev'da Next.js HMR modulni qayta yuklaydi — global'da saqlanmasa har
 * yangilanishda yangi pool ochilib, ulanishlar tugab qoladi.
 */
export function getPool(): Pool {
  if (!globalThis.__vakansiyaPool) {
    const url = connectionString();
    globalThis.__vakansiyaPool = new Pool({
      connectionString: url,
      // Supabase'da TLS majburiy, lokal Postgres'da yo'q
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
      max: Number(process.env.PGPOOL_MAX ?? 8),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalThis.__vakansiyaPool;
}

/** Parametrli so'rov. SQL matniga qiymat qo'shib yozilmasin — faqat $1, $2. */
export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await getPool().query<T>(text, params);
  return rows;
}

/** Bitta qator (yoki null). */
export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Tranzaksiya — importda ishlatiladi. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

/** Skriptlar oxirida ulanishlarni yopish (Next.js'da chaqirilmaydi). */
export async function closePool(): Promise<void> {
  if (globalThis.__vakansiyaPool) {
    await globalThis.__vakansiyaPool.end();
    globalThis.__vakansiyaPool = undefined;
  }
}
