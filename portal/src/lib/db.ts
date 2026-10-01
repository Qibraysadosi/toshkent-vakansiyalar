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

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
/** `pg` shu parametrlarni URL'dan o'qib, bizning `ssl` obyektimizni BEKOR qiladi. */
const URL_SSL_PARAMS = ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'sslnegotiation'];

/**
 * TLS sozlamasi. Lokal Postgres'da TLS yo'q; masofadagi (Supabase pooler)
 * ulanishda sertifikat MAJBURIY tekshiriladi — `rejectUnauthorized: false`
 * bo'lsa o'rtadagi hujumchi o'z sertifikati bilan parol va barcha ma'lumotni
 * o'qiy oladi.
 *
 * Supabase sertifikati o'z CA'si (prod-ca-2021.crt) bilan imzolangan — u
 * Node'ning tizim do'konida yo'q, shuning uchun PEM matni `PG_CA_CERT` env
 * orqali beriladi (Supabase -> Settings -> Database -> SSL configuration).
 * Bo'sh qolsa Node'ning standart CA ro'yxati ishlatiladi: ochiq CA bilan
 * imzolangan sertifikat o'tadi, o'z-o'zini imzolagan esa aniq xato bilan
 * rad etiladi (jim yumshatilmaydi).
 *
 * DIQQAT: `pg` URL'dagi `sslmode=`/`sslrootcert=` ni shu obyektdan USTUN
 * qo'yadi (`sslmode=require` esa tekshiruvni o'chiradi) — shuning uchun
 * DATABASE_URL da bunday parametrlar taqiqlanadi.
 */
let sslWarned = false;

function sslConfig(url: string): false | { rejectUnauthorized: boolean; ca?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('DATABASE_URL yaroqli URL emas (postgresql://user:parol@host:port/baza).');
  }
  if (LOCAL_HOSTS.has(parsed.hostname)) return false;

  // URL'dagi sslmode/sslrootcert kabi parametrlar e'tiborga olinmaydi — TLS shu yerda sozlanadi
  const present = URL_SSL_PARAMS.filter((k) => parsed.searchParams.has(k));
  if (present.length && !sslWarned) {
    console.warn(`[db] DATABASE_URL dagi ${present.map((k) => `${k}=`).join(', ')} e'tiborga olinmaydi — TLS src/lib/db.ts da sozlanadi.`);
  }

  // Vercel'da PEM ko'p qatorli yoki `\n` bilan bir qatorda kelishi mumkin
  const ca = process.env.PG_CA_CERT?.replace(/\\n/g, '\n').trim();
  if (ca) return { rejectUnauthorized: true, ca };

  // CA berilmagan: ulanish shifrlangan, lekin sertifikat tekshirilmaydi (MITM'dan
  // himoya yo'q). Supabase → Settings → Database → SSL → CA sertifikatini PG_CA_CERT
  // ga qo'ying — shunda qat'iy tekshiruv yoqiladi.
  if (!sslWarned) {
    sslWarned = true;
    console.warn('[db] PG_CA_CERT o\'rnatilmagan — TLS sertifikati tekshirilmayapti. Supabase CA sertifikatini PG_CA_CERT ga qo\'ying.');
  }
  return { rejectUnauthorized: false };
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
      ssl: sslConfig(url),
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
  let broken = false;
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    try {
      await client.query('rollback');
    } catch {
      // Rollback ham o'tmadi — ulanish uzilgan. Asl xato (masalan INSERT'niki)
      // saqlanadi, buzilgan client esa pool'ga qaytarilmaydi.
      broken = true;
    }
    throw err;
  } finally {
    // `release(true)` clientni yo'q qiladi; sog'lom client (oddiy SQL xatosidan
    // keyin toza rollback) avvalgidek pool'ga qaytadi.
    client.release(broken);
  }
}

/** Skriptlar oxirida ulanishlarni yopish (Next.js'da chaqirilmaydi). */
export async function closePool(): Promise<void> {
  if (globalThis.__vakansiyaPool) {
    await globalThis.__vakansiyaPool.end();
    globalThis.__vakansiyaPool = undefined;
  }
}
