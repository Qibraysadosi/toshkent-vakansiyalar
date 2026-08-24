import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ma'lumot bazasi faqat server tomonda o'qiladi — client bundle'ga
  // SUPABASE_SERVICE_KEY hech qachon tushmasligi kerak (lib/env.ts qarang).
  typedRoutes: true,
};

export default nextConfig;
