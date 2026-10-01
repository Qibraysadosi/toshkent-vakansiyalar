'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { transliterate, type Script } from '@/lib/transliterate';

interface Suggestion {
  label: string;
  positions: number;
  position_search: string;
}

const TEXT = {
  lat: {
    placeholder: 'Kasb yoki korxona: qorovul, hamshira, oshpaz...',
    search: 'Qidirish',
    clear: 'Tozalash',
    hint: 'ta ish o\'rni',
  },
  cyr: {
    placeholder: 'Касб ёки корхона: қоровул, ҳамшира, ошпаз...',
    search: 'Қидириш',
    clear: 'Тозалаш',
    hint: 'та иш ўрни',
  },
} as const;

/**
 * PLAN §3.3 — yozayotganda (debounce 250ms) top-6 mos lavozim va har birida
 * nechta ish o'rni borligi ko'rsatiladi.
 */
export function SearchBox({
  script,
  defaultValue = '',
  autoFocus = false,
  size = 'katta',
}: {
  script: Script;
  defaultValue?: string;
  autoFocus?: boolean;
  size?: 'katta' | 'kichik';
}) {
  const t = TEXT[script];
  const router = useRouter();
  const listId = useId();

  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // URL (?q=) o'zgarganda — Back/Forward, chip havolalari, "Tozalash" — inputni sinxronlash.
  // /vakansiyalar da komponent qayta o'rnatilmaydi (faqat searchParams o'zgaradi),
  // shuning uchun holat faqat mount'da emas, har safar yangilanishi kerak.
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  // Debounce 250ms (PLAN §3.3)
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { items: Suggestion[] };
        setItems(data.items);
        setActive(-1);
      } catch {
        /* bekor qilindi — e'tiborsiz */
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  // Tashqariga bosilganda yopish
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function submit(q: string) {
    setOpen(false);
    const trimmed = q.trim();
    // Taklifdan tanlanganda input ham tanlangan matnni ko'rsatsin (yozilgan qismini emas)
    setValue(trimmed);
    router.push(trimmed ? `/vakansiyalar?q=${encodeURIComponent(trimmed)}` : '/vakansiyalar');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      submit(transliterate(items[active].label, script));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const big = size === 'katta';
  const listOpen = open && items.length > 0;
  // aria-activedescendant uchun har bir variantning id'si
  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className={`flex overflow-hidden rounded-karta border bg-yuza transition-shadow ${
          listOpen
            ? 'border-chinni shadow-[0_8px_28px_-12px_rgba(19,145,165,0.45)]'
            : 'border-chiziq focus-within:border-chinni'
        }`}
      >
        <input
          type="search"
          name="q"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t.placeholder}
          aria-label={t.search}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listOpen ? listId : undefined}
          aria-expanded={listOpen}
          aria-activedescendant={listOpen && active >= 0 && active < items.length ? optionId(active) : undefined}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-tosh ${
            big ? 'px-5 py-4 text-base' : 'px-4 py-2.5 text-sm'
          }`}
        />
        <button
          type="submit"
          className={`shrink-0 bg-chinni font-500 text-white transition-colors hover:bg-chinni-toq ${
            big ? 'px-7 text-sm' : 'px-4 text-xs'
          }`}
        >
          {t.search}
        </button>
      </form>

      {listOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t.search}
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-karta border border-chiziq bg-yuza shadow-[0_12px_34px_-14px_rgba(16,35,58,0.35)]"
        >
          {items.map((item, i) => {
            // Bazadagi yozuv kirillcha bo'lishi mumkin — ekranda tanlangan
            // alifboda ko'rsatiladi. Ikkalasi ham normalize() da bir xil
            // kalitga tushgani uchun qidiruv natijasi o'zgarmaydi.
            const label = transliterate(item.label, script);
            return (
            <li
              key={item.position_search}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submit(label)}
              className={`flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-2.5 text-left text-sm transition-colors ${
                i === active ? 'bg-chinni/8 text-chinni' : 'hover:bg-fon'
              }`}
            >
              <span className="line-clamp-1">{label}</span>
              <span className="raqam shrink-0 text-xs text-tosh">
                {item.positions} {t.hint}
              </span>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
