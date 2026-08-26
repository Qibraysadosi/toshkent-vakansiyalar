import type { Metadata, Viewport } from 'next';
import { Unbounded, Golos_Text, IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';
import { getScript } from '@/lib/script';
import { siteUrl } from '@/lib/env';
import { ScriptToggle } from '@/components/ScriptToggle';
import './globals.css';

/* PLAN §5.2 — uchala shrift ham to'liq kirill + lotin qo'llab-quvvatlaydi. */
const unbounded = Unbounded({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-unbounded',
  display: 'swap',
});

const golos = Golos_Text({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-golos',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Toshkent vakansiyalari — rasmiy bo'sh ish o'rinlari",
    template: '%s — Toshkent vakansiyalari',
  },
  description:
    "Toshkentdagi 15 000 dan ortiq rasmiy bo'sh ish o'rni. Tumanlar bo'yicha qidiruv, " +
    "maosh ma'lumoti, to'g'ridan-to'g'ri korxona telefoni.",
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    siteName: 'Toshkent vakansiyalari',
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#10233A',
};

const NAV = [
  { href: '/vakansiyalar', lat: 'Vakansiyalar', cyr: 'Вакансиялар' },
  { href: '/statistika', lat: 'Statistika', cyr: 'Статистика' },
] as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const script = await getScript();

  return (
    <html lang={script === 'cyr' ? 'uz-Cyrl' : 'uz'} className={`${unbounded.variable} ${golos.variable} ${plexMono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#asosiy"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-siyoh focus:px-4 focus:py-2 focus:text-white"
        >
          {script === 'cyr' ? 'Асосий қисмга ўтиш' : "Asosiy qismga o'tish"}
        </a>

        <header className="bosmada-yashir sticky top-0 z-40 border-b border-chiziq bg-qogoz/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
            <Link href="/" className="font-display text-base font-700 tracking-tight text-siyoh">
              Toshkent<span className="text-chinni">.ish</span>
            </Link>

            <nav className="hidden gap-5 text-xs sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-tosh transition-colors hover:text-chinni"
                >
                  {script === 'cyr' ? item.cyr : item.lat}
                </Link>
              ))}
            </nav>

            <div className="ml-auto">
              <ScriptToggle current={script} />
            </div>
          </div>
        </header>

        <main id="asosiy" className="flex-1">
          {children}
        </main>

        <footer className="bosmada-yashir mt-20 bg-siyoh text-qogoz">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
              <div className="max-w-sm">
                <div className="font-display text-base font-600">
                  Toshkent<span className="text-chinni">.ish</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-qogoz/70">
                  {script === 'cyr'
                    ? 'Расмий ойлик базадан йиғилган бўш иш ўринлари. Маълумот ҳар ой янгиланади.'
                    : "Rasmiy oylik bazadan yig'ilgan bo'sh ish o'rinlari. Ma'lumot har oy yangilanadi."}
                </p>
              </div>

              <nav className="flex flex-col gap-2 text-xs">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="text-qogoz/70 hover:text-white">
                    {script === 'cyr' ? item.cyr : item.lat}
                  </Link>
                ))}
                <Link href="/api/v1/vacancies?limit=5" className="text-qogoz/70 hover:text-white">
                  {script === 'cyr' ? 'Очиқ API' : 'Ochiq API'}
                </Link>
              </nav>
            </div>

            <p className="mt-10 border-t border-white/10 pt-6 text-xs text-qogoz/50">
              {script === 'cyr'
                ? 'Маълумот манбаи — расмий ойлик вакансиялар базаси.'
                : "Ma'lumot manbai — rasmiy oylik vakansiyalar bazasi."}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
