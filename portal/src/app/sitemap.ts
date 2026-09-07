import type { MetadataRoute } from 'next';
import { getAllCompanyStirs, getAllVacancyIds } from '@/lib/queries';
import { DISTRICTS } from '@/lib/districts';
import { siteUrl } from '@/lib/env';

export const revalidate = 86400;

/**
 * PLAN §10 — dinamik sitemap. 12 ming vakansiya + 1 ming korxona bitta faylga
 * sig'adi (chegara 50 000), lekin o'sish ehtimolini hisobga olib bo'laklarga
 * bo'lish uchun `generateSitemaps` ishlatilishi mumkin.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  // Baza vaqtincha ulanmasa (masalan, build paytida) — statik sahifalar
  // bilan chegaralanamiz; build yiqilmaydi, keyingi revalidate'da to'ladi.
  let vacancyIds: number[] = [];
  let stirs: string[] = [];
  try {
    [vacancyIds, stirs] = await Promise.all([getAllVacancyIds(), getAllCompanyStirs()]);
  } catch (err) {
    console.error('sitemap: baza ulanmadi —', err instanceof Error ? err.message : err);
  }

  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/vakansiyalar`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/statistika`, changeFrequency: 'monthly', priority: 0.6 },
    ...DISTRICTS.map((d) => ({
      url: `${base}/tuman/${d.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...vacancyIds.map((id) => ({
      url: `${base}/vakansiya/${id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...stirs.map((stir) => ({
      url: `${base}/korxona/${stir}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
