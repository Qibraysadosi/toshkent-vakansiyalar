/**
 * Importdan keyin obunachilarga xabar (PLAN §9).
 *
 *   npm run notify                 # oxirgi batch
 *   npm run notify -- 2026-08      # aniq batch
 *
 * Talab: NEXT_PUBLIC_SITE_URL ommaviy manzil — xabardagi havolalar shundan yasaladi.
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

async function main() {
  // Yuborilgan xabarni qaytarib bo'lmaydi — localhost havolali xabar ketmasin
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || site.includes('localhost')) {
    throw new Error("NEXT_PUBLIC_SITE_URL ommaviy https manzil bo'lishi kerak — xabardagi havolalar shundan yasaladi.");
  }

  const { sendNotifications } = await import('../src/lib/notify');
  const { closePool } = await import('../src/lib/db');
  const batch = process.argv[2];
  try {
    // Skriptda vaqt chegarasi yo'q — hammasi bir yurishda ketadi
    const r = await sendNotifications(batch, { timeBudgetMs: 0 });
    console.log(`Yuborildi: ${r.sent}, mos vakansiya yo'q: ${r.skipped}, xato: ${r.failed}`);
    if (r.remaining > 0) console.log(`Ko'rib chiqilmagan: ${r.remaining} — skriptni qayta ishga tushiring.`);
  } finally {
    await closePool();
  }
}

main().catch((err: unknown) => {
  console.error(`XATO: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
