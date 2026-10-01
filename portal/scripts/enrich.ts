/**
 * Korxonalarni tashqi manbalardan boyitish (PLAN.md §8).
 *
 *   npm run enrich:probe            # qaysi manba javob berishini tekshiradi
 *   npm run enrich -- --limit 50    # 50 ta korxonani boyitadi
 *   npm run enrich                  # hammasini (1 035 STIR)
 *
 * TAQIQ (PLAN §8): orginfo.uz ni jonli parsing qilmaymiz — kuniga ~50 ta
 * so'rovdan keyin bloklaydi. Shuning uchun avval rasmiy reyestrlar sinaladi,
 * ular ishlamasa sayt Excel'dagi ma'lumot bilan to'liq ishlayveradi.
 *
 * Skript ehtiyotkor: sekundiga 1 ta so'rov, xatoda to'xtamaydi, oxirida
 * hisobot beradi. Qayta ishga tushirilsa faqat hali boyitilmaganlarni oladi.
 */

import { config as loadEnv } from 'dotenv';
import { closePool, query } from '../src/lib/db';
import { parseDate } from '../src/lib/import-transform';

loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

const DELAY_MS = 1000; // 1 req/sek — PLAN §8
const TIMEOUT_MS = 15_000;

interface Source {
  name: string;
  note: string;
  url: (stir: string) => string;
  /** Javobdan `companies` ustunlarini ajratib oladi. */
  parse: (body: unknown) => Partial<EnrichedFields> | null;
}

interface EnrichedFields {
  official_name: string | null;
  address: string | null;
  activity_type: string | null;
  registered_date: string | null;
  status: string | null;
}

/**
 * Manbalar PLAN §8 dagi tartibda. Javob sxemasi tasdiqlanmagan — shuning
 * uchun `parse` bir nechta mumkin bo'lgan maydon nomini qidiradi va
 * topilmasa `null` qaytaradi (skript yiqilmaydi).
 */
const SOURCES: Source[] = [
  {
    name: 'stat.uz KTYADR',
    note: 'Davlat statistika qo\'mitasi reyestri — orginfo ham shundan oladi',
    url: (stir) => `https://stat.uz/api/v1/organizations/${stir}`,
    parse: (body) => pick(body),
  },
  {
    name: 'data.egov.uz',
    note: 'Ochiq ma\'lumotlar portali (API kalit talab qilishi mumkin)',
    url: (stir) => `https://data.egov.uz/apiPartner/v1/json/organizations/${stir}`,
    parse: (body) => pick(body),
  },
];

/** Turli manbalarda maydon nomlari har xil — barchasini sinab ko'ramiz. */
function pick(body: unknown): Partial<EnrichedFields> | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  const data = (root.data ?? root.result ?? root.organization ?? root) as Record<string, unknown>;
  if (!data || typeof data !== 'object') return null;

  const str = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = data[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };

  const fields: Partial<EnrichedFields> = {
    official_name: str('name', 'full_name', 'fullName', 'organization_name', 'nomi'),
    address: str('address', 'legal_address', 'manzil', 'addr'),
    activity_type: str('activity', 'activity_type', 'oked_name', 'faoliyat'),
    status: str('status', 'state', 'holati'),
    // API sanani qanday berishi noma'lum ("12.05.2010", "2010-05-12T00:00:00", "—" ...).
    // Tekshirilmagan satr `::date` ga yuborilsa Postgres yiqiladi — shuning uchun
    // faqat haqiqiy "YYYY-MM-DD" o'tadi, qolgani null (ustun tegilmaydi).
    registered_date: (() => {
      const raw = str('registered_date', 'registration_date', 'reg_date');
      if (!raw) return null;
      const iso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
      return parseDate(iso);
    })(),
  };

  return Object.values(fields).some(Boolean) ? fields : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': 'toshkent-vakansiyalar/1.0' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return null; // HTML qaytdi — bu endpoint JSON bermaydi
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** PLAN §8 — "Avval bitta STIR bilan sinov: qaysi endpoint ochiq javob qaytaradi." */
async function probe(): Promise<void> {
  const row = await query<{ stir: string; name: string }>(
    'select stir, name from companies order by stir limit 1',
  );
  const stir = row[0]?.stir ?? '206806140';
  console.log(`Sinov STIR: ${stir}${row[0] ? ` (${row[0].name})` : ''}\n`);

  for (const source of SOURCES) {
    const url = source.url(stir);
    process.stdout.write(`${source.name.padEnd(20)} `);
    const body = await fetchJson(url);

    if (body === null) {
      console.log('javob yo\'q (bloklangan, 404 yoki JSON emas)');
    } else {
      const parsed = source.parse(body);
      console.log(parsed ? `ISHLAYDI → ${JSON.stringify(parsed).slice(0, 120)}` : 'JSON keldi, lekin maydonlar tanilmadi');
      if (!parsed) console.log(`   xom javob: ${JSON.stringify(body).slice(0, 200)}`);
    }
    console.log(`   ${source.note}\n   ${url}\n`);
    await sleep(DELAY_MS);
  }

  console.log(
    'Hech biri ishlamasa — bu kutilgan holat (PLAN §8 zaxira rejasi):\n' +
      '  sayt Excel ma\'lumoti + korxona sahifasidagi orginfo.uz havolasi bilan to\'liq ishlaydi.',
  );
}

async function enrich(limit: number | null): Promise<void> {
  const companies = await query<{ stir: string; name: string }>(
    `select stir, name from companies where enriched_at is null order by stir ${limit ? 'limit $1' : ''}`,
    limit ? [limit] : [],
  );
  console.log(`Boyitiladi: ${companies.length} ta korxona (1 req/sek)\n`);

  let ok = 0;
  let empty = 0;
  const failed: string[] = [];

  for (const [i, c] of companies.entries()) {
    // Bitta korxonadagi xato (yaroqsiz javob, baza xatosi) butun yurishni
    // to'xtatmasin: yozib qo'yamiz, enriched_at tegilmaydi — keyingi yurishda qayta olinadi.
    try {
      let fields: Partial<EnrichedFields> | null = null;

      for (const source of SOURCES) {
        const body = await fetchJson(source.url(c.stir));
        if (body) fields = source.parse(body);
        if (fields) break;
        await sleep(DELAY_MS);
      }

      if (fields) {
        await query(
          `update companies set official_name = coalesce($2, official_name),
                                address = coalesce($3, address),
                                activity_type = coalesce($4, activity_type),
                                registered_date = coalesce($5::date, registered_date),
                                status = coalesce($6, status),
                                enriched_at = now()
           where stir = $1`,
          [
            c.stir,
            fields.official_name ?? null,
            fields.address ?? null,
            fields.activity_type ?? null,
            fields.registered_date ?? null,
            fields.status ?? null,
          ],
        );
        ok++;
      } else {
        empty++;
      }
    } catch (err) {
      failed.push(c.stir);
      console.error(`\n  ${c.stir}: yozib bo'lmadi — ${err instanceof Error ? err.message : String(err)}`);
    }

    if ((i + 1) % 25 === 0 || i === companies.length - 1) {
      process.stdout.write(
        `  ${i + 1}/${companies.length}  (topildi: ${ok}, bo'sh: ${empty}, xato: ${failed.length})\r`,
      );
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n\nTugadi. Boyitildi: ${ok}, ma'lumot topilmadi: ${empty}, xato: ${failed.length}.`);
  if (failed.length) {
    // Bular enriched_at'siz qoladi va keyingi yurishda yana birinchi bo'lib
    // olinadi — operator ko'rib chiqishi uchun ro'yxat.
    console.log(`Xato bo'lgan STIR'lar (qayta urinish uchun enriched_at bo'sh qoldirildi): ${failed.join(', ')}`);
  }
  if (ok === 0) {
    console.log(
      "Hech narsa topilmadi — manbalar yopiq bo'lishi mumkin. `npm run enrich:probe` bilan tekshiring.",
    );
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--probe')) return probe();

  const limitAt = argv.indexOf('--limit');
  const limit = limitAt !== -1 && argv[limitAt + 1] ? Number(argv[limitAt + 1]) : null;
  if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error('--limit musbat butun son bo\'lishi kerak');
  }
  return enrich(limit);
}

main()
  .catch((err: unknown) => {
    console.error(`\nXATO: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => closePool());
