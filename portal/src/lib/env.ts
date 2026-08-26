/**
 * Muhit o'zgaruvchilari. `DATABASE_URL` va `ADMIN_PASSWORD` — faqat server
 * tomonda; ular hech qachon client bundle'ga tushmaydi, chunki bu modul
 * `server-only` bog'liqligi bor fayllardan chaqiriladi.
 */

/** Sayt manzili — sitemap, robots va OG rasmlar uchun. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** Admin paroli. O'rnatilmagan bo'lsa admin panel butunlay yopiq. */
export function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length > 0 ? p : null;
}
