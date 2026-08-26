import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { adminPassword } from './env';

/**
 * Admin panel himoyasi (PLAN §6 — "Parol (env) bilan").
 *
 * Cookie'da parolning o'zi emas, undan olingan HMAC saqlanadi. Tekshirish
 * `timingSafeEqual` bilan — bayt-bayt solishtirish vaqtidan parolni topib
 * bo'lmasin.
 *
 * `ADMIN_PASSWORD` o'rnatilmagan bo'lsa panel BUTUNLAY yopiq: kirish shakli
 * ham ko'rsatilmaydi.
 */

const COOKIE = 'admin_sessiya';

function token(password: string): string {
  return createHmac('sha256', password).update('toshkent-vakansiyalar-admin').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Panel umuman yoqilganmi (env'da parol bormi)? */
export function adminEnabled(): boolean {
  return adminPassword() !== null;
}

export async function isAdmin(): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value && safeEqual(value, token(password)));
}

/** Parol to'g'ri bo'lsa cookie o'rnatadi. */
export async function signIn(candidate: string): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;
  if (!safeEqual(candidate, password)) return false;

  (await cookies()).set(COOKIE, token(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 soat
  });
  return true;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
