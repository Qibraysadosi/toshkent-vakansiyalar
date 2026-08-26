import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ma'lumot bazasi faqat server tomonda o'qiladi (lib/db.ts `server-only`).
  poweredByHeader: false,
  compress: true,
  // typedRoutes o'chirilgan: filtrlar URL query'da yuriladi
  // (`/vakansiyalar?tuman=...`), typedRoutes esa dinamik query bilan
  // har bir href'da qo'lda tur berishni talab qiladi — foydasi xarajatidan kam.
};

export default nextConfig;
