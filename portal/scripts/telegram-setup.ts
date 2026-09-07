/**
 * Telegram webhook'ni saytga bog'laydi (bir marta, deploydan keyin).
 *
 *   NEXT_PUBLIC_SITE_URL=https://sayt.uz npm run telegram:setup
 *
 * Talab: TG_BOT_TOKEN va TG_WEBHOOK_SECRET .env.local (yoki Vercel env) da.
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

async function main() {
  const { setWebhook, webhookInfo } = await import('../src/lib/telegram');
  const secret = process.env.TG_WEBHOOK_SECRET;
  if (!secret) throw new Error("TG_WEBHOOK_SECRET o'rnatilmagan — istalgan uzun tasodifiy satr qo'ying.");
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || site.includes('localhost')) {
    throw new Error("NEXT_PUBLIC_SITE_URL ommaviy https manzil bo'lishi kerak — Telegram lokal manzilga yeta olmaydi.");
  }

  await setWebhook(secret);
  const info = await webhookInfo();
  console.log(`Webhook o'rnatildi: ${info.url}`);
  if (info.last_error_message) console.log(`Oxirgi xato: ${info.last_error_message}`);
}

main().catch((err: unknown) => {
  console.error(`XATO: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
