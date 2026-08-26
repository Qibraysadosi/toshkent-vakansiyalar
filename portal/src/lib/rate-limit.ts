import { NextResponse } from 'next/server';

/**
 * PLAN §10 — qidiruv API'siga oddiy IP bo'yicha cheklov.
 * Xotirada saqlanadi: bitta instans uchun yetarli. Trafik o'sganda Upstash
 * kabi tashqi hisoblagichga o'tkaziladi.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'nomalum'
  );
}

export function rateLimit(
  request: Request,
  { key, limit, windowMs }: { key: string; limit: number; windowMs: number },
): NextResponse | null {
  const id = `${key}:${clientIp(request)}`;
  const now = Date.now();
  const bucket = buckets.get(id);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    // Vaqti o'tgan yozuvlarni tozalab turamiz (xotira o'smasligi uchun)
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return null;
  }

  bucket.count++;
  if (bucket.count > limit) {
    return NextResponse.json(
      { error: "Juda ko'p so'rov. Bir oz kutib qayta urinib ko'ring." },
      {
        status: 429,
        headers: { 'retry-after': String(Math.ceil((bucket.resetAt - now) / 1000)) },
      },
    );
  }
  return null;
}
