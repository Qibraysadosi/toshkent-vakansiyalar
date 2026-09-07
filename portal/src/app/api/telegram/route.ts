import { webhookCallback } from 'grammy';
import { NextResponse } from 'next/server';
import { botConfigured, createBot } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * Telegram webhook (PLAN §9). Har so'rovda `X-Telegram-Bot-Api-Secret-Token`
 * sarlavhasi TG_WEBHOOK_SECRET bilan solishtiriladi — begona POST'lar rad
 * etiladi. Secret `npm run telegram:setup` orqali Telegram'ga beriladi.
 */
export async function POST(request: Request) {
  if (!botConfigured()) return NextResponse.json({ error: 'bot sozlanmagan' }, { status: 503 });

  const secret = process.env.TG_WEBHOOK_SECRET;
  if (secret && request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const handler = webhookCallback(createBot(), 'std/http', { timeoutMilliseconds: 25_000 });
  return handler(request);
}

export function GET() {
  return NextResponse.json({ ok: true, configured: botConfigured() });
}
