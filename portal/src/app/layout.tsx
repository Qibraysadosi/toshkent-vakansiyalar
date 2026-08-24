import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Toshkent vakansiyalari',
  description:
    "Toshkentdagi rasmiy bo'sh ish o'rinlari: tumanlar bo'yicha qidiruv, maosh statistikasi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
