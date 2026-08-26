import { NextResponse } from 'next/server';
import { autocomplete } from '@/lib/queries';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** PLAN §3.3 — yozayotganda top-6 mos lavozim. */
export async function GET(request: Request) {
  const limited = rateLimit(request, { key: 'autocomplete', limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.length > 100) return NextResponse.json({ items: [] });

  const items = await autocomplete(q, 6);
  return NextResponse.json(
    { items },
    { headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' } },
  );
}
