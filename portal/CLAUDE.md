# CLAUDE.md — Toshkent vakansiyalar portali

> **Har sessiya boshida `PLAN.md` ni o'qing.** Bosqichdan tashqariga chiqmang —
> yangi g'oya bo'lsa PLAN.md ning "Keyinga" bo'limiga yozib qo'ying.

Loyiha `portal/` papkasida. Repo ildizidagi **Fintellect** (React + Vite
buxgalteriya chat ilovasi) — butunlay boshqa loyiha, unga tegilmaydi.

## Buyruqlar

Hammasi `portal/` ichidan ishga tushiriladi.

| Buyruq | Vazifasi |
| --- | --- |
| `npm run db:up` | Lokal Postgres (Docker) ko'taradi |
| `npm run db:schema` | `supabase/schema.sql` ni qo'llaydi (idempotent) |
| `npm run db:reset` | Jadvallarni o'chirib, sxemani qaytadan qo'llaydi |
| `npm run import -- data/fayl.xlsx` | Excel'ni bazaga yuklash |
| `npm run import:dry -- data/fayl.xlsx` | Faqat hisobot, bazaga yozmaydi |
| `npm run dev` | Dev server — http://localhost:3000 |
| `npm run build` | Production build (deploydan oldin tekshiring) |
| `npm test` | Vitest — normalize, transliterate, import qoidalari |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run enrich:probe` | 6-bosqich: boyitish manbalari javob beradimi |
| `npm run enrich -- --limit 50` | Korxonalarni boyitish (1 req/sek) |

Import parametrlari: `--dry-run` (`-n`), `--batch <nom>`, `--out <fayl>`.

## Muhit o'zgaruvchilari

`.env.example` dan `.env.local` yarating.

| O'zgaruvchi | Izoh |
| --- | --- |
| `DATABASE_URL` | Postgres ulanish satri. Lokal yoki Supabase — bir xil ishlaydi |
| `NEXT_PUBLIC_SITE_URL` | Kanonik manzil (sitemap, robots, OG rasmlar) |
| `ADMIN_PASSWORD` | `/admin` paroli. **Bo'sh bo'lsa admin panel butunlay yopiq** |
| `TG_BOT_TOKEN` | Telegram bot (7-bosqich, hali yozilmagan) |

## Baza qatlami — nega supabase-js emas

Sayt Postgres'ga **to'g'ridan-to'g'ri** `pg` orqali ulanadi (`src/lib/db.ts`),
`@supabase/supabase-js` ishlatilmaydi. Sabab:

- Qidiruv `similarity()`, trigram reytingi va autocomplete guruhlashiga
  tayanadi — bularni PostgREST orqali qilib bo'lmaydi.
- Bitta `DATABASE_URL` bilan lokal Postgres ham, Supabase ham ishlaydi.

`schema.sql` dagi RLS siyosatlari o'z kuchida qoladi: ular Supabase'ning ochiq
PostgREST endpointini himoya qiladi (kelajakda mobil ilova undan foydalanishi
mumkin), sayt esa server tomondan SQL yozadi.

Vercel'da **Transaction pooler** (port 6543) manzilini ishlating — serverless
funksiyalar uchun shu mo'ljallangan.

`src/lib/db.ts` ikkita `pg` sozlamasini o'zgartiradi: `int8` raqamga
o'giriladi (aks holda `id` string bo'lib keladi), `date` esa xom
`"YYYY-MM-DD"` satri bo'lib qoladi (aks holda vaqt zonasi sanani siljitadi).

## Konvensiyalar — buzilmasin

- **`normalize()` — bitta manba fayl:** `src/lib/normalize.ts`. Sayt, import va
  Telegram bot AYNAN shu funksiyani ishlatadi. Uni o'zgartirsangiz
  `position_search` / `name_search` ustunlari eskirib qoladi — **importni
  qaytadan yuritish shart**.
- **`transliterate()` — faqat ko'rinadigan matn uchun** (`src/lib/transliterate.ts`).
  U apostrofni saqlaydi va katta harfni qaytaradi; `normalize()` esa qidiruv
  kalitini beradi. Test bu ikkovining mosligini qotirib qo'ygan:
  `normalize(transliterate(x, 'lat')) === normalize(x)`.
- **STIR — har doim `string`**, hech qachon `number`. `parseStir()` uni 9 xonaga
  to'ldiradi (`padStart(9,'0')`).
- **Excel ustun nomlari kirillcha** — `src/lib/import-transform.ts` dagi
  `EXCEL_HEADERS` dan nusxa oling, qo'lda yozmang.
- **Original yozuv saqlanadi:** `position` ustuni Excel'dagidek (kirill yoki
  lotin) qoladi; qidiruv faqat `position_search` bo'yicha boradi; ekranga
  chiqishda `transliterate()` qo'llanadi.
- **Tuman:** filtrlash har doim `vacancies.district` bo'yicha.
  `companies.district` — shunchaki eng ko'p uchragan tuman (4 ta korxona bir
  nechta tumanda ishlaydi, bittasi hamma 12 tumanda).
- **SQL faqat `src/lib/queries.ts` da**, qiymatlar faqat `$1, $2` parametrlari
  orqali.
- Interfeys matni o'zbekcha, "siz"da. Har komponentda `TEXT = { lat, cyr }`
  obyekti — tarjima shu yerda turadi.

## Dizayn-tizim (PLAN §5)

Ranglar va shriftlar `src/app/globals.css` dagi `@theme` blokida:
`siyoh` `chinni` `chinni-toq` `quyosh` `qogoz` `tosh` `chiziq`.

- **`quyosh` — bitta ekranda faqat bitta joyda** ("N ta o'rin" nishoni).
- Yirik yakka raqamlar — `font-display` (proporsional). `.raqam` (IBM Plex
  Mono, tabular) faqat ustma-ust turadigan raqamlar uchun: maosh, jadval,
  o'q yozuvlari.
- Animatsiya faqat uch joyda: hisoblagich, ro'yxat stagger-fade, xarita hover.
  `prefers-reduced-motion` hurmat qilinadi.
- Xarita (`src/lib/districts.ts` + `DistrictMap.tsx`) — poligonlar markazga
  qarab 3.5% kichraytiriladi, shunda tumanlar "koshin" bo'lib ajralib turadi.

### Grafiklar

`/statistika` — Recharts. Ranglar validator bilan tekshirilgan:

- Bitta qatorli grafiklar → **bitta rang** (`#1391A5`). Nominal toifalarga
  qiymat-rampasi berilmaydi (bu uzunlikni ikki marta kodlaydi).
- Ta'lim darajasi tartiblangan → ordinal ramp `#094F5B → #1391A5 → #6FBFCE`.
- Har grafik ostida `<details>` ichida jadval — rangga tayanmaslik uchun.

## Ma'lumot haqida bilib qo'yish kerak

2026-07 fayli bo'yicha o'lchangan:

- 15 174 Excel qatori → **12 163** vakansiya yozuvi (3 011 takror
  birlashtirilgan, `positions_count` ga yig'ilgan; yig'indi yana 15 174).
- 1 035 korxona, 12 tuman.
- Lavozimlarning **89%** i kirill yozuvida — shuning uchun `normalize()` shart.
  "qorovul": oddiy qidiruv 6 ta topadi, `position_search` bo'yicha **62 ta**.
- Maosh: 8 939 qatorda raqam, 6 166 tasida "shtat jadvali bo'yicha" matni,
  8 tasida 100 mln dan katta xato qiymat, 61 tasida 10 ming dan kichik
  (9 so'm, 1 so'm) — oxirgi ikkalasi `salary_note='Aniqlashtirilmoqda'`.
- Telefon ustunida bitta korxonaga bir nechta raqam vergul bilan kelishi mumkin.

## Ma'lum muammo

`xlsx` (SheetJS) npm registry'dagi oxirgi versiyasi **0.18.5** va unda ma'lum
zaiflik bor (CVE-2023-30533, prototype pollution). Yangi 0.20.x faqat SheetJS
CDN'ida.

Yumshatish: fayl **`{ header: 1 }`** (massiv rejimi) bilan o'qiladi —
sarlavhalardan obyekt kaliti yasalmaydi, ya'ni zaiflik yo'li ochilmaydi.
Admin paneldagi yuklash oynasi ham shu rejimda ishlaydi va parol bilan
himoyalangan. Shunga qaramay, `exceljs` ga o'tish rejalashtirilgan.

## Bosqichlar

PLAN.md §11 va oxiridagi "Bosqichlar holati" jadvali.

1. ✅ Poydevor — sxema, `normalize()`, import
2. ✅ MVP UI — bosh sahifa, ro'yxat + filtrlar, vakansiya sahifasi
3. ✅ Dizayn-tizim + tumanlar xaritasi
4. ✅ Qidiruv v2 — autocomplete, sinonimlar, alifbo tugmasi
5. ✅ Admin — import UI, dashboard, sinonimlar, loglar
6. ◐ `/statistika` va korxona sahifalari tayyor; **boyitish** manbasi hali
   tasdiqlanmagan (`npm run enrich:probe` ni O'zbekistondan ishga tushiring)
7. ◐ OG rasmlar, PWA, sitemap, JobPosting, rate limit, `/api/v1` tayyor;
   **Telegram bot** yozilmagan (token kerak), domen va Lighthouse o'lchovi qolgan
