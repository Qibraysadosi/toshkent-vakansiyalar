import { NextResponse } from 'next/server';

/**
 * PLAN §10 — qidiruv API'siga (va admin kirishiga) oddiy IP bo'yicha cheklov.
 *
 * Xotirada saqlanadi: bitta instans uchun yetarli. Vercel serverless'da har
 * instans (va har sovuq start) o'z Map'iga ega — bu birinchi qatlam, xolos.
 * Trafik o'sganda Upstash kabi tashqi hisoblagichga yoki kichik
 * `login_attempts` jadvaliga (schema.sql + queries.ts) o'tkaziladi.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Header'lardan mijoz IP'si (proksi ortida `x-forwarded-for` birinchi qiymati). */
export function clientIpFromHeaders(h: Headers): string {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'nomalum';
}

function clientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}

/**
 * Sof hisoblagich: `id` uchun `windowMs` oynada `limit` dan ortiq urinish
 * bo'ldimi. Request/NextResponse'ga bog'liq emas — server action'lardan ham
 * chaqiriladi.
 */
export function hitBucket(id: string, limit: number, windowMs: number): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(id);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    // Vaqti o'tgan yozuvlarni tozalab turamiz (xotira o'smasligi uchun)
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { limited: false, retryAfterSec: 0 };
  }

  bucket.count++;
  return { limited: bucket.count > limit, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
}

export function rateLimit(
  request: Request,
  { key, limit, windowMs }: { key: string; limit: number; windowMs: number },
): NextResponse | null {
  const r = hitBucket(`${key}:${clientIp(request)}`, limit, windowMs);
  if (!r.limited) return null;
  return NextResponse.json(
    { error: "Juda ko'p so'rov. Bir oz kutib qayta urinib ko'ring." },
    { status: 429, headers: { 'retry-after': String(r.retryAfterSec) } },
  );
}
