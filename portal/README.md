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
npm run db:schema              # jadvallar, indekslar, sinonimlar (.env.local ni o'zi o'qiydi, psql shart emas)

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
npm test          # normalize, transliterate, format va import qoidalari (vitest)
npm run lint      # ESLint 9 (next/core-web-vitals + typescript)
npm run typecheck
npm run build
```

## Bulutda ishlash — Claude Code (kompyuter shart emas)

Repo ildizidagi `.claude/hooks/session-start.sh` har yangi **Claude Code (web)**
sessiyasida o'zi ishga tushadi: Postgres'ni ko'taradi, `schema.sql` ni qo'llaydi,
`portal/.env.local` yozadi, `npm install` qiladi. Shuning uchun telefondagi
Claude ilovasidan ochilgan sessiyada ham `npm test`, `npm run build`, `npm run dev`
darhol ishlaydi.

- Sessiyada **ma'lumot ham bo'lsin** desangiz, Excel faylni `portal/data/seed/`
  papkasiga qo'yib commit qiling — baza bo'sh bo'lsa hook uni o'zi import qiladi.
- Yoki Claude Code muhit sozlamalarida `DATABASE_URL` ni (Supabase) secret sifatida
  bering — sessiya to'g'ridan-to'g'ri haqiqiy bazaga ulanadi (`db:reset` ishlatmang!).

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
| `/tuman/[slug]` | 12 ta tuman sahifasi (SEO, har so'rovda render) |
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

## Deploy (Vercel + Supabase)

Vercel loyihasi: **`toshkent-vakansiyalar`** (Root Directory: `portal`, framework: Next.js).
Muhit o'zgaruvchilari — `.env.example` bo'yicha; `ADMIN_PASSWORD` va
`TG_WEBHOOK_SECRET` Vercel'da o'rnatilgan, `NEXT_PUBLIC_SITE_URL` shart emas
(Vercel'ning `VERCEL_PROJECT_PRODUCTION_URL` idan olinadi).

1. **Supabase**: yangi loyiha → SQL Editor → `supabase/schema.sql` matnini ishga
   tushiring. Settings → Database → Connection string → URI, **Transaction pooler**
   (port 6543) manzilini nusxalang.
2. **Vercel** → loyiha → Settings → Environment Variables → `DATABASE_URL` = shu
   manzil (Production + Preview) → Deployments → Redeploy.
   `DATABASE_URL` bo'lmasa sayt xato o'rniga shu qadamlarni ko'rsatib turadi.
3. `/admin` → Import orqali Excel yuklang (Vercel'da fayl **4,5 MB** dan katta
   bo'lmasin; kattasi uchun kompyuterda `npm run import -- fayl.xlsx`).
4. Har push'da avtomatik deploy uchun Vercel'ga GitHub ilovasini ulang:
   vercel.com → Add New → Project → Import Git Repository → `Jhonjonsin2006/fintellect`
   (loyiha allaqachon bor — Settings → Git → Connect ham bo'ladi). `portal/` hozircha
   faqat `claude/new-session-e6mypq` shoxida — Settings → Git → Production Branch'ni
   shu shoxga qo'ying yoki PR'ni `main` ga qo'shing.
5. Telegram: `TG_BOT_TOKEN` ni qo'shib redeploy qiling, keyin bir marta
   `npm run telegram:setup`.
