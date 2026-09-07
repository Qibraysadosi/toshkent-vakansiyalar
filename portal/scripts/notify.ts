/**
 * Importdan keyin obunachilarga xabar (PLAN §9).
 *
 *   npm run notify                 # oxirgi batch
 *   npm run notify -- 2026-08      # aniq batch
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

async function main() {
  const { sendNotifications } = await import('../src/lib/notify');
  const { closePool } = await import('../src/lib/db');
  const batch = process.argv[2];
  try {
    const r = await sendNotifications(batch);
    console.log(`Yuborildi: ${r.sent}, mos vakansiya yo'q: ${r.skipped}, xato: ${r.failed}`);
  } finally {
    await closePool();
  }
}

main().catch((err: unknown) => {
  console.error(`XATO: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
