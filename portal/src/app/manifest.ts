import type { MetadataRoute } from 'next';

/** PLAN §10 — PWA: telefonga o'rnatib qo'yish mumkin. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Toshkent vakansiyalari',
    short_name: 'Toshkent.ish',
    description: "Toshkentdagi rasmiy bo'sh ish o'rinlari",
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F4EE',
    theme_color: '#10233A',
    lang: 'uz',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
