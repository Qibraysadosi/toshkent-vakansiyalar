# Toshkent vakansiyalar portali

Toshkentdagi rasmiy bo'sh ish o'rinlari uchun qidiruv portali: 15 000+ vakansiya,
lotin/kirill farqisiz qidiruv, tumanlar bo'yicha filtr, ochiq maosh statistikasi.

Manba — rasmiy oylik Excel bazasi. To'liq reja: [PLAN.md](./PLAN.md).
Ishlab chiqish konvensiyalari: [CLAUDE.md](./CLAUDE.md).

## Stack

Next.js 15 (App Router) · PostgreSQL + `pg_trgm` (lokal yoki Supabase) ·
Tailwind CSS 4 · TypeScript · Vitest · Recharts · SheetJS (`xlsx`)

## Lokalda ishga tushirish

```bash
cd portal
npm install
cp .env.example .env.local     # standart qiymatlar lokal Postgres uchun tayyor

npm run db:up                  # Postgres (Docker)
npm run db:schema              # jadvallar, indekslar, sinonimlar

# Excel faylni portal/data/ ga qo'ying
npm run import:dry -- data/vakansiyalar.xlsx   # avval hisobotni ko'ring
npm run import -- data/vakansiyalar.xlsx       # keyin bazaga yozing

npm run dev                    # http://localhost:3000
```

Docker bo'lmasa — istalgan Postgres 16 ishlaydi, `DATABASE_URL` ni
`.env.local` da ko'rsating. `schema.sql` `pg_trgm` kengaytmasini o'zi
yaratadi va ikkala muhitda ham (oddiy Postgres / Supabase) ishlaydi.

Admin panel: `.env.local` da `ADMIN_PASSWORD` ni o'rnating va
`/admin` ni oching.

## Tekshiruv

```bash
npm test          # normalize, transliterate va import qoidalari (50 test)
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
  src/app/                      sahifalar: /, /vakansiyalar, /vakansiya/[id],
                                /korxona/[stir], /tuman/[slug], /statistika, /admin
  src/components/               SearchBox, VacancyCard, FilterPanel, DistrictMap ...
  src/lib/normalize.ts          qidiruv kaliti — sayt, import, bot uchun bitta manba
  src/lib/transliterate.ts      Lotin ↔ Кирилл (ko'rinadigan matn uchun)
  src/lib/queries.ts            barcha SQL shu yerda
  src/lib/import-transform.ts   Excel → baza tozalash qoidalari (sof funksiyalar)
  scripts/import.ts             oylik importni yurituvchi skript
  scripts/enrich.ts             korxonalarni tashqi manbadan boyitish (6-bosqich)
  supabase/schema.sql           jadvallar, indekslar, RLS siyosatlari
  data/                         Excel fayllari (git'ga tushmaydi)
```

## Sahifalar

| Yo'l | Nima bor |
| --- | --- |
| `/` | Hero qidiruv + jonli hisoblagich, tumanlar xaritasi, top kasblar |
| `/vakansiyalar` | Ro'yxat + filtrlar (hammasi URL query'da, ulashsa bo'ladi) |
| `/vakansiya/[id]` | To'liq ma'lumot, `tel:` tugma, o'xshash vakansiyalar, JobPosting schema |
| `/korxona/[stir]` | Korxona kartasi + barcha vakansiyalari |
| `/tuman/[slug]` | 12 ta SEO sahifa (statik generatsiya) |
| `/statistika` | Ochiq analitika (Recharts) |
| `/saqlangan` | Saqlangan vakansiyalar (brauzerda, loginsiz) |
| `/admin` | Parol bilan: import (oldindan ko'rish → tasdiqlash), vakansiyalarni yashirish, sinonimlar, loglar, Telegram |
| `/api/v1/vacancies` | Ochiq JSON API (`?q=&tuman=&ids=`) |
| `/api/telegram` | Telegram bot webhook |

## Imkoniyatlar

- Kirill/lotin farqisiz qidiruv, sinonimlar, xato yozilgan so'rov uchun fuzzy fallback
- Lotin / Кирилл tugmasi — butun sayt o'giriladi
- Yorug' / tungi rejim (tizimga ergashadi, qo'lda ham tanlanadi)
- Telefon: pastki navigatsiya, filtrlar pastdan chiqadigan oynada
- Saqlangan vakansiyalar, yaqinda ko'rilganlar (loginsiz)
- Barqaror havolalar: oylik importda bir xil vakansiya o'z manzilini saqlab qoladi
- Telegram bot: kasb + tuman bo'yicha obuna, importdan keyin xabar

## Deploy

Vercel · **Root Directory: `portal`** · muhit o'zgaruvchilari `.env.example` bo'yicha.
