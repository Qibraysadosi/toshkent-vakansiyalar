'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Script } from '@/lib/transliterate';

const ITEMS = [
  {
    href: '/',
    lat: 'Bosh',
    cyr: 'Бош',
    match: (p: string) => p === '/',
    icon: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    href: '/vakansiyalar',
    lat: 'Qidiruv',
    cyr: 'Қидирув',
    match: (p: string) => p.startsWith('/vakansiya') || p.startsWith('/tuman') || p.startsWith('/korxona'),
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  {
    href: '/saqlangan',
    lat: 'Saqlangan',
    cyr: 'Сақланган',
    match: (p: string) => p.startsWith('/saqlangan'),
    icon: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />,
  },
  {
    href: '/statistika',
    lat: 'Statistika',
    cyr: 'Статистика',
    match: (p: string) => p.startsWith('/statistika'),
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
] as const;

/**
 * Telefonda pastki navigatsiya — ilova kabi. `env(safe-area-inset-bottom)`
 * iPhone'dagi uy indikatori ustiga chiqib ketmasligi uchun.
 */
export function MobileNav({ script }: { script: Script }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={script === 'cyr' ? 'Асосий навигация' : 'Asosiy navigatsiya'}
      className="bosmada-yashir fixed inset-x-0 bottom-0 z-40 border-t border-chiziq bg-yuza/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-500 transition-colors ${
                  active ? 'text-chinni' : 'text-tosh'
                }`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {item.icon}
                </svg>
                {script === 'cyr' ? item.cyr : item.lat}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
