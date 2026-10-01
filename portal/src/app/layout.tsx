import type { Metadata, Viewport } from 'next';
import { Unbounded, Golos_Text, IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';
import { getScript } from '@/lib/script';
import { getTheme } from '@/lib/theme';
import { dbConfigured, siteUrl } from '@/lib/env';
import { ScriptToggle } from '@/components/ScriptToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MobileNav } from '@/components/MobileNav';
import { Shortcuts } from '@/components/Shortcuts';
import { SetupNotice } from '@/components/SetupNotice';
import './globals.css';

/*
 * PLAN §5.2 — uchala shrift ham to'liq kirill + lotin qo'llab-quvvatlaydi.
 * `subsets` faqat qaysi fayllar oldindan yuklanishini (preload) belgilaydi —
 * qolgan @font-face'lar (cyrillic-ext: Қ Ғ Ҳ) unicode-range bo'yicha kerak
 * bo'lganda yuklanadi. `latin-ext` o'zbek matnida ishlatilmaydi (ʻ U+02BB
 * `latin` ichida) — uni preload qilish ~146 KB behuda edi, LCP'ga zarar.
 */
const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-unbounded',
  display: 'swap',
});

const golos = Golos_Text({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-golos',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'cyrillic'],
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
  applicationName: 'Toshkent.ish',
  openGraph: { type: 'website', locale: 'uz_UZ', siteName: 'Toshkent vakansiyalari' },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Toshkent.ish' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F4EE' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1A2B' },
  ],
};

const NAV = [
  { href: '/vakansiyalar', lat: 'Vakansiyalar', cyr: 'Вакансиялар' },
  { href: '/statistika', lat: 'Statistika', cyr: 'Статистика' },
  { href: '/saqlangan', lat: 'Saqlangan', cyr: 'Сақланган' },
] as const;

/** PLAN §9 — botga deep-link CTA. `NEXT_PUBLIC_TG_BOT` (bot username) bo'lmasa ko'rsatilmaydi. */
function tgBotUrl(): string | null {
  const bot = process.env.NEXT_PUBLIC_TG_BOT?.trim().replace(/^@/, '');
  return bot ? `https://t.me/${bot}` : null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [script, theme] = await Promise.all([getScript(), getTheme()]);
  const cyr = script === 'cyr';
  const botUrl = tgBotUrl();

  return (
    <html
      lang={cyr ? 'uz-Cyrl' : 'uz'}
      data-theme={theme === 'system' ? undefined : theme}
      className={`${unbounded.variable} ${golos.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="mobil-nav-joy flex min-h-screen flex-col">
        <a
          href="#asosiy"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-siyoh focus:px-4 focus:py-2 focus:text-qogoz"
        >
          {cyr ? 'Асосий қисмга ўтиш' : "Asosiy qismga o'tish"}
        </a>

        {/* 320–360px: logo 16px + qisqa alifbo yorliqlari + gap-3 — qator ≈ 270px, sig'adi.
            `overflow-x-clip` — kelajakda uzunroq yorliq sahifani gorizontal surmasin. */}
        <header className="bosmada-yashir sticky top-0 z-40 overflow-x-clip border-b border-chiziq bg-fon/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:gap-5 sm:px-6">
            <Link href="/" className="shrink-0 whitespace-nowrap font-display text-sm font-700 tracking-tight text-matn sm:text-base">
              Toshkent<span className="text-chinni">.ish</span>
            </Link>

            <nav aria-label={cyr ? 'Асосий' : 'Asosiy'} className="hidden gap-5 text-xs md:flex">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-tosh transition-colors hover:text-chinni">
                  {cyr ? item.cyr : item.lat}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <ThemeToggle current={theme} script={script} />
              <ScriptToggle current={script} />
            </div>
          </div>
        </header>

        <main id="asosiy" className="flex-1">
          {dbConfigured() ? children : <SetupNotice cyr={cyr} />}
        </main>

        <footer className="bosmada-yashir mt-20 bg-siyoh text-qogoz">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
              <div className="max-w-sm">
                <div className="font-display text-base font-600">
                  Toshkent<span className="text-[#5fcadb]">.ish</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-qogoz/70">
                  {cyr
                    ? 'Расмий ойлик базадан йиғилган бўш иш ўринлари. Маълумот ҳар ой янгиланади.'
                    : "Rasmiy oylik bazadan yig'ilgan bo'sh ish o'rinlari. Ma'lumot har oy yangilanadi."}
                </p>
              </div>

              <nav aria-label={cyr ? 'Футер' : 'Futer'} className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs sm:grid-cols-1">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="text-qogoz/70 hover:text-white">
                    {cyr ? item.cyr : item.lat}
                  </Link>
                ))}
                <Link href="/api/v1/vacancies?limit=5" className="text-qogoz/70 hover:text-white">
                  {cyr ? 'Очиқ API' : 'Ochiq API'}
                </Link>
                <Link href="/admin" className="text-qogoz/60 hover:text-white">
                  Admin
                </Link>
              </nav>
            </div>

            {botUrl && (
              <a
                href={botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-qogoz transition-colors hover:border-[#5fcadb] hover:text-[#5fcadb]"
              >
                {cyr ? 'Янги вакансиялардан хабардор бўлинг — Telegram бот' : "Yangi vakansiyalardan xabardor bo'ling — Telegram bot"}
              </a>
            )}

            <p className="mt-10 border-t border-white/10 pt-6 text-xs text-qogoz/50">
              {cyr
                ? 'Маълумот манбаи — расмий ойлик вакансиялар базаси.'
                : "Ma'lumot manbai — rasmiy oylik vakansiyalar bazasi."}
            </p>
          </div>
        </footer>

        <MobileNav script={script} />
        <Shortcuts />
      </body>
    </html>
  );
}
