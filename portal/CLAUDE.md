# CLAUDE.md — Toshkent vakansiyalar portali

> **Har sessiya boshida `PLAN.md` ni o'qing.** Bosqichdan tashqariga chiqmang —
> yangi g'oya bo'lsa PLAN.md ning "Keyinga" bo'limiga yozib qo'ying.

Loyiha `portal/` papkasida. Repo ildizidagi **Fintellect** (React + Vite
buxgalteriya chat ilovasi) — butunlay boshqa loyiha, unga tegilmaydi.

## Buyruqlar

Hammasi `portal/` ichidan ishga tushiriladi.

| Buyruq | Vazifasi |
| --- | --- |
| `npm run dev` | Dev server — http://localhost:3000 |
| `npm run build` | Production build (deploydan oldin tekshiring) |
| `npm test` | Vitest — `normalize()` va import qoidalari |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run import -- data/fayl.xlsx` | Excel'ni bazaga yuklash |
| `npm run import:dry -- data/fayl.xlsx` | Faqat hisobot, bazaga yozmaydi |
| `npm run import -- fayl.xlsx --out data/out/clean.json` | Tozalangan ma'lumotni JSON'ga chiqarish |

Import parametrlari: `--dry-run` (`-n`), `--batch <nom>`, `--out <fayl>`.

## Muhit o'zgaruvchilari

`.env.example` dan `.env.local` yarating.

| O'zgaruvchi | Qayerda | Izoh |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase loyiha URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Faqat o'qish, RLS bilan cheklangan |
| `SUPABASE_SERVICE_KEY` | **faqat server** | RLS'ni chetlab o'tadi — brauzerga chiqmasin |
| `ADMIN_PASSWORD` | server | Admin panel (5-bosqich) |
| `TG_BOT_TOKEN` | server | Telegram bot (7-bosqich) |

`src/lib/env.ts` — `serverEnv()` brauzerda chaqirilsa xato tashlaydi. Yangi
server-only kalitlar shu faylga qo'shiladi.

## Bazani birinchi marta tayyorlash

1. Supabase'da yangi loyiha oching.
2. SQL Editor → `supabase/schema.sql` ni to'liq nusxalab "Run".
   Skript idempotent — qayta ishga tushirsa ham xato bermaydi.
3. `.env.local` ni to'ldiring.
4. Excel faylni `data/` ga qo'ying va importni ishga tushiring.

`data/*.xlsx` va `data/out/` git'ga tushmaydi (`.gitignore`).

## Konvensiyalar — buzilmasin

- **`normalize()` — bitta manba fayl:** `src/lib/normalize.ts`. Sayt, import va
  Telegram bot AYNAN shu funksiyani ishlatadi. Uni o'zgartirsangiz
  `position_search` / `name_search` ustunlari eskirib qoladi — **importni
  qaytadan yuritish shart**.
- **STIR — har doim `string`**, hech qachon `number`. Excel'da raqam bo'lib
  keladi, `parseStir()` uni 9 xonaga to'ldiradi (`padStart(9,'0')`).
- **Excel ustun nomlari kirillcha** — `src/lib/import-transform.ts` dagi
  `EXCEL_HEADERS` dan nusxa oling, qo'lda yozmang.
- **Sana:** Excel'da `DD.MM.YYYY`, bazada `date` (ISO).
- **Original yozuv saqlanadi:** `position` ustuni Excel'dagidek (kirill yoki
  lotin) qoladi, qidiruv esa faqat `position_search` bo'yicha boradi.
- **Tuman:** filtrlash har doim `vacancies.district` bo'yicha.
  `companies.district` — shunchaki eng ko'p uchragan tuman (4 ta korxona bir
  nechta tumanda ishlaydi, bittasi hamma 12 tumanda).
- Interfeys matni o'zbekcha, lotin yozuvida, "siz"da.

## Import mantiqi qayerda

- `src/lib/import-transform.ts` — **sof** funksiyalar (fayl/tarmoq yo'q),
  tozalash qoidalari shu yerda va testlar bilan qotirilgan.
- `scripts/import.ts` — fayl o'qish + Supabase'ga yozish.

Yozish tartibi (PLAN §7, o'zgartirmang): `companies` upsert → yangi batch bilan
`vacancies` insert → **keyin** eski batch o'chiriladi → `import_history`.
Shu tartibda sayt hech qachon bo'sh jadval ko'rmaydi.

`companies` upsert'ida faqat Excel'dan keladigan ustunlar yoziladi, shunda
6-bosqichda boyitilgan maydonlar (`official_name`, `address`, ...) o'chib
ketmaydi.

## Ma'lumot haqida bilib qo'yish kerak

2026-07 fayli bo'yicha o'lchangan:

- 15 174 Excel qatori → **12 163** vakansiya yozuvi (3 011 takror birlashtirilgan,
  `positions_count` ga yig'ilgan; yig'indi yana 15 174 bo'ladi).
- 1 035 korxona, 12 tuman.
- Lavozimlarning ~89% i kirill yozuvida — shuning uchun `normalize()` shart.
  "qorovul": oddiy qidiruv 6 ta topadi, `position_search` bo'yicha **62 ta**.
- Maosh: 8 939 qatorda raqam, 6 166 tasida "shtat jadvali bo'yicha" matni,
  8 tasida 100 mln dan katta xato qiymat, 61 tasida 10 ming dan kichik
  (9 so'm, 1 so'm) — oxirgi ikkalasi `salary_note='Aniqlashtirilmoqda'` bo'ladi.
- Telefon ustunida bitta korxonaga bir nechta raqam vergul bilan kelishi mumkin.

## Ma'lum muammo

`xlsx` (SheetJS) npm registry'dagi oxirgi versiyasi **0.18.5** va unda ma'lum
zaiflik bor (CVE-2023-30533 prototype pollution). Yangi 0.20.x faqat SheetJS
CDN'ida, u bu muhitdan bloklangan. Lokal skript uchun xavf past (fayl ishonchli
manbadan), lekin **5-bosqichda admin panelga fayl yuklash oynasi qo'shilishidan
oldin** `exceljs` ga o'tish yoki CDN versiyasini o'rnatish kerak.

## Bosqichlar

PLAN.md §11. Har bosqich oxirida: tekshiruv → deploy → PLAN.md da ✅ + status.

1. ✅ Poydevor — sxema, `normalize()`, import
2. MVP UI — bosh sahifa, ro'yxat + filtrlar, vakansiya sahifasi
3. Dizayn-tizim + tumanlar xaritasi
4. Qidiruv v2 — autocomplete, sinonimlar, alifbo tugmasi
5. Admin — import UI, dashboard
6. Korxona boyitish + `/statistika`
7. Telegram bot + sayqal
