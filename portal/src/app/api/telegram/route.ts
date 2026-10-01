import { webhookCallback } from 'grammy';
import { NextResponse } from 'next/server';
import { botConfigured, createBot, webhookConfigured } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
// Vercel: sovuq start + Supabase pooler + Telegram API bitta yangilanishda 10 s
// standart chegaradan oshishi mumkin. grammY timeout'i (25 s) bundan kichik.
export const maxDuration = 30;

const HANDLER_TIMEOUT_MS = 25_000;

/**
 * Telegram webhook (PLAN §9). `X-Telegram-Bot-Api-Secret-Token` sarlavhasi
 * TG_WEBHOOK_SECRET bilan solishtiriladi (grammY, doimiy vaqtli taqqoslash) —
 * begona POST'lar 401 oladi. Secret o'rnatilmagan bo'lsa webhook YOPIQ (503):
 * ochiq qolsa istalgan kishi soxta yangilanish bilan obunani o'chira olardi.
 * Secret `npm run telegram:setup` orqali Telegram'ga beriladi.
 */
export async function POST(request: Request) {
  if (!botConfigured()) return NextResponse.json({ error: 'bot sozlanmagan' }, { status: 503 });

  const secret = process.env.TG_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "TG_WEBHOOK_SECRET o'rnatilmagan" }, { status: 503 });

  const handler = webhookCallback(createBot(), 'std/http', {
    secretToken: secret,
    timeoutMilliseconds: HANDLER_TIMEOUT_MS,
    // Vaqt tugasa 200 qaytariladi: 500 bo'lsa Telegram yangilanishni qayta
    // yuboradi va allaqachon saqlangan obuna/xabar takrorlanadi.
    onTimeout: () => console.error(`telegram webhook: yangilanish ${HANDLER_TIMEOUT_MS} ms ichida tugamadi`),
  });
  return handler(request);
}

export function GET() {
  return NextResponse.json({ ok: true, configured: botConfigured(), webhook: webhookConfigured() });
}
