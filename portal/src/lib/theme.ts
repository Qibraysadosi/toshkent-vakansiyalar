import 'server-only';
import { cookies } from 'next/headers';

export type Theme = 'light' | 'dark' | 'system';
export const THEME_COOKIE = 'mavzu';

/**
 * Mavzu (yorug'/tungi) cookie'da saqlanadi va `<html data-theme>` ga server
 * tomonda yoziladi — sahifa "miltillamaydi". `system` bo'lsa atribut
 * qo'yilmaydi va CSS `prefers-color-scheme` ni o'zi kuzatadi.
 */
export async function getTheme(): Promise<Theme> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === 'dark' || v === 'light' ? v : 'system';
}
