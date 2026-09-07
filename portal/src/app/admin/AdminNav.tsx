'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin', label: 'Umumiy', exact: true },
  { href: '/admin/import', label: 'Import' },
  { href: '/admin/vakansiyalar', label: 'Vakansiyalar' },
  { href: '/admin/sinonimlar', label: 'Sinonimlar' },
  { href: '/admin/loglar', label: 'Qidiruv loglari' },
  { href: '/admin/obunachilar', label: 'Telegram' },
];

/** Desktop'da chap ustun, telefonda gorizontal aylanadigan tablar. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin bo'limlari" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0 [scrollbar-width:none]">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-full px-3.5 py-2 text-xs font-500 transition-colors lg:rounded-md ${
                  active ? 'bg-chinni text-white' : 'text-tosh hover:bg-yuza hover:text-matn'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
