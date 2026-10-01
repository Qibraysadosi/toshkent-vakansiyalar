import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ma'lumot bazasi faqat server tomonda o'qiladi (lib/db.ts `server-only`).
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverActions: {
      // Admin paneldan Excel yuklash: standart 1 MB chegarasi oylik fayl
      // (~0.9 MB, o'sib boradi) uchun yetmaydi. Vercel Functions esa so'rov
      // tanasini 4.5 MB dan yuqorida platforma darajasida (413) rad etadi —
      // undan katta qiymat qo'yishdan foyda yo'q (admin/actions.ts: 4 MB).
      bodySizeLimit: '5mb',
    },
  },
  // typedRoutes o'chirilgan: filtrlar URL query'da yuriladi
  // (`/vakansiyalar?tuman=...`), typedRoutes esa dinamik query bilan
  // har bir href'da qo'lda tur berishni talab qiladi — foydasi xarajatidan kam.
};

export default nextConfig;
