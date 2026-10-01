import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { adminPassword } from './env';

/**
 * Admin panel himoyasi (PLAN §6 — "Parol (env) bilan").
 *
 * Cookie'da parolning o'zi emas, `exp.hmac` ko'rinishidagi imzolangan muddat
 * saqlanadi: `exp` — sessiya tugash vaqti (unix soniya), `hmac` — paroldan
 * olingan kalit bilan `exp` ustidan HMAC. Tekshirish `timingSafeEqual` bilan —
 * bayt-bayt solishtirish vaqtidan parolni topib bo'lmasin.
 *
 * Muddat SERVER tomonda tekshiriladi: brauzerdan ko'chirib olingan cookie
 * 8 soatdan keyin o'z-o'zidan yaroqsiz bo'ladi, `ADMIN_PASSWORD` almashsa —
 * darhol. Server holati yo'q (Vercel serverless): shuning uchun `signOut`
 * faqat brauzer cookie'sini o'chiradi, nusxasini muddatidan oldin bekor
 * qila olmaydi — bunga `admin_sessions` jadvali kerak bo'lardi.
 *
 * `ADMIN_PASSWORD` o'rnatilmagan bo'lsa panel BUTUNLAY yopiq: kirish shakli
 * ham ko'rsatilmaydi.
 */

const COOKIE = 'admin_sessiya';
const TTL_S = 60 * 60 * 8; // 8 soat

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** Imzo kaliti — paroldan olinadi, parolning o'zi hech qayerga chiqmaydi. */
function key(password: string): Buffer {
  return createHmac('sha256', password).update('toshkent-vakansiyalar-admin').digest();
}

function sign(password: string, exp: number): string {
  return createHmac('sha256', key(password)).update(String(exp)).digest('hex');
}

function mint(password: string): string {
  const exp = nowSec() + TTL_S;
  return `${exp}.${sign(password, exp)}`;
}

function verify(password: string, value: string): boolean {
  const dot = value.indexOf('.');
  if (dot < 0) return false;
  const exp = Number(value.slice(0, dot));
  const mac = value.slice(dot + 1);
  if (!Number.isInteger(exp) || exp <= nowSec()) return false;
  return safeEqual(mac, sign(password, exp));
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
  return Boolean(value && verify(password, value));
}

/** Parol to'g'ri bo'lsa muddatli, imzolangan cookie o'rnatadi. */
export async function signIn(candidate: string): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;
  if (!safeEqual(candidate, password)) return false;

  (await cookies()).set(COOKIE, mint(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_S, // brauzer tomonida ham shu muddat; asosiy tekshiruv `verify` da
  });
  return true;
}

/** Brauzer cookie'sini o'chiradi (server holati yo'q — nusxasi muddatigacha yaroqli qoladi). */
export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
