# Toshkent vakansiyalar portali

Toshkentdagi rasmiy bo'sh ish o'rinlari uchun qidiruv portali: 15 000+ vakansiya,
lotin/kirill farqisiz qidiruv, tumanlar bo'yicha filtr, ochiq maosh statistikasi.

Manba — rasmiy oylik Excel bazasi. To'liq reja: [PLAN.md](./PLAN.md).
Ishlab chiqish konvensiyalari: [CLAUDE.md](./CLAUDE.md).

## Stack

Next.js 15 (App Router) · Supabase Postgres + `pg_trgm` · Tailwind CSS 4 ·
TypeScript · Vitest · SheetJS (`xlsx`)

## Ishga tushirish

```bash
cd portal
npm install
cp .env.example .env.local     # Supabase kalitlarini to'ldiring
npm run dev                    # http://localhost:3000
```

Bazani tayyorlash: Supabase SQL Editor'da [`supabase/schema.sql`](./supabase/schema.sql)
ni ishga tushiring, so'ng Excel faylni yuklang:

```bash
npm run import:dry -- data/vakansiyalar.xlsx   # avval hisobotni ko'ring
npm run import -- data/vakansiyalar.xlsx       # keyin bazaga yozing
```

## Tekshiruv

```bash
npm test          # normalize() va import qoidalari (39 test)
npm run typecheck
npm run build
```

## Nima uchun `normalize()` muhim

Bazadagi lavozimlarning ~89% i kirill yozuvida, ~11% i lotinda — bir xil kasb
ikki xil yozilgan. `src/lib/normalize.ts` ikkalasini bitta qidiruv kalitiga
keltiradi (`Қоровул` = `qorovul` = `Qorovul` = `qo'rovul`).

Natija: "qorovul" so'rovi oddiy qidiruvda **6 ta**, normalize bilan **62 ta**
ish o'rnini topadi.

## Struktura

```
portal/
  src/lib/normalize.ts          qidiruv normallashtirish — sayt, import, bot uchun bitta manba
  src/lib/import-transform.ts   Excel → baza tozalash qoidalari (sof funksiyalar)
  src/lib/supabase.ts           anon (o'qish) va service (import/admin) mijozlari
  scripts/import.ts             oylik importni yurituvchi skript
  supabase/schema.sql           jadvallar, indekslar, RLS siyosatlari
  data/                         Excel fayllari (git'ga tushmaydi)
```

## Deploy

Vercel · **Root Directory: `portal`** · muhit o'zgaruvchilari `.env.example` bo'yicha.
