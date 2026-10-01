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
| `npm run db:schema` | `supabase/schema.sql` ni qo'llaydi (idempotent, migratsiyalar ham shu yerda) |
| `npm run db:reset` | Jadvallarni o'chirib, sxemani qaytadan qo'llaydi |
| `npm run import -- data/fayl.xlsx` | Excel'ni bazaga yuklash (`--batch 2026-08`) |
| `npm run import:dry -- data/fayl.xlsx` | Faqat hisobot, bazaga yozmaydi |
| `npm run dev` | Dev server — http://localhost:3000 |
| `npm run build` | Production build (deploydan oldin tekshiring) |
| `npm test` | Vitest — normalize, transliterate, format, import qoidalari |
| `npm run lint` | ESLint 9 flat config (`eslint.config.mjs`: next/core-web-vitals + typescript) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run enrich:probe` | 6-bosqich: boyitish manbalari javob beradimi |
| `npm run enrich -- --limit 50` | Korxonalarni boyitish (1 req/sek) |
| `npm run telegram:setup` | Bot webhook'ini saytga bog'laydi (deploydan keyin, bir marta) |
| `npm run notify` | Obunachilarga oxirgi batchdagi mos vakansiyalarni yuboradi |

## Muhit o'zgaruvchilari

`.env.example` dan `.env.local` yarating.

| O'zgaruvchi | Izoh |
| --- | --- |
| `DATABASE_URL` | Postgres ulanish satri. Lokal yoki Supabase — bir xil ishlaydi |
| `NEXT_PUBLIC_SITE_URL` | Kanonik manzil (sitemap, robots, OG rasmlar, bot havolalari). Vercel'da bo'sh qoldirsa bo'ladi — `VERCEL_PROJECT_PRODUCTION_URL` olinadi |
| `ADMIN_PASSWORD` | `/admin` paroli. **Bo'sh bo'lsa admin panel butunlay yopiq** (12+ belgi tavsiya) |
| `PG_CA_CERT` | Supabase CA sertifikati (PEM). Berilsa masofadagi ulanishda sertifikat qat'iy tekshiriladi; bo'sh bo'lsa shifrlangan-lekin-tekshirilmagan (ogohlantirish). URL'dagi `sslmode=` e'tiborga olinmaydi |
| `TG_BOT_TOKEN` | Telegram bot tokeni (@BotFather). Bo'sh bo'lsa bot va bildirishnoma o'chiq |
| `TG_WEBHOOK_SECRET` | **Majburiy** (TG_BOT_TOKEN bilan birga, Vercel'da ham): bo'sh bo'lsa `/api/telegram` 503 qaytaradi; chiquvchi bildirishnomalar unga bog'liq emas |

`DATABASE_URL` bo'lmasa `layout.tsx` sahifa o'rniga `SetupNotice` (sozlash
yo'riqnomasi) ko'rsatadi — `dbConfigured()` (`env.ts`). Build bazasiz ham o'tadi.

## Bulutli sessiya (Claude Code web / telefon)

Repo ildizidagi `.claude/hooks/session-start.sh` (SessionStart hook, faqat
`CLAUDE_CODE_REMOTE=true` da) Postgres 16 ni ishga tushiradi, `vak`/`vakansiyalar`
ni yaratadi, `schema.sql` ni qo'llaydi, `.env.local` yozadi, `npm install` qiladi
va baza bo'sh bo'lsa `data/seed/*.xlsx` ni import qiladi. Muhitda `DATABASE_URL`
bo'lsa (secret) `.env.local` shuni oladi. Lokal tekshiruv uchun sun'iy fayl
`data/demo.xlsx` (gitignore) — haqiqiy ma'lumot emas.

## Baza qatlami — nega supabase-js emas

Sayt Postgres'ga **to'g'ridan-to'g'ri** `pg` orqali ulanadi (`src/lib/db.ts`).
Sabab: qidiruv `similarity()`, trigram reytingi va autocomplete guruhlashiga
tayanadi — bularni PostgREST orqali qilib bo'lmaydi. Bitta `DATABASE_URL`
bilan lokal Postgres ham, Supabase ham ishlaydi. `schema.sql` dagi RLS
siyosatlari o'z kuchida (Supabase'ning ochiq PostgREST endpointi uchun).

Vercel'da **Transaction pooler** (port 6543) manzilini ishlating.

`db.ts` ikkita `pg` sozlamasini o'zgartiradi: `int8` raqamga o'giriladi,
`date` xom `"YYYY-MM-DD"` satri bo'lib qoladi (vaqt zonasi siljitmasin).

**`server-only` faqat** `script.ts`, `theme.ts`, `admin-auth.ts` da
(ular `next/headers` ishlatadi). `queries.ts` va boshqa modullar `tsx`
skriptlaridan ham chaqiriladi — ularga `server-only` qo'shilsa skriptlar
yiqiladi.

## Import — barqaror id'lar

Har vakansiyaning `fingerprint` i bor:
`md5(stir | tuman | bo'lim | lavozim | stavka | maosh | izoh | ta'lim | kvota)`.
**Sana kirmaydi.** Import shu bo'yicha upsert qiladi:

- Keyingi oy ham kelgan vakansiya **o'z `id`sini, `views` va `is_hidden`
  holatini saqlab qoladi** — saqlanganlar, ulashilgan havolalar, Telegram
  xabarlari va Google indeksi buzilmaydi. Faqat sana, o'rin soni va batch
  yangilanadi.
- Bitta fayl ichida faqat sanasi farq qiladigan qatorlar ham birlashadi
  (eng so'nggi sana qoladi).
- Yangi faylda yo'q vakansiyalar o'chadi — **batch nomiga emas, aynan shu
  importda tegilgan id'larga qarab** (`delete ... where not (id = any(...))`).
  Shuning uchun bir xil batch nomi bilan qayta yuklash xavfsiz.
- **`first_batch`** faqat insert'da yoziladi (vakansiya birinchi paydo bo'lgan
  batch); Telegram bildirishnomalari "yangi" deb shuni oladi — ko'chib o'tgan
  vakansiya har oy qayta yuborilmaydi. `subscriptions.last_batch` — admin tugmasi
  batch bo'yicha idempotent va davom ettiriladigan (45 s byudjet, `remaining`
  qaytadi); `npm run notify` cheklovsiz.

Skript va admin panel bitta kodni ishlatadi: `src/lib/import-run.ts`
(`parseWorkbook` → `transformRows` → `writeImport`). Admin panelda ikki
bosqich: fayl `import_staging` jadvaliga tozalangan holda yoziladi, hisobot
ko'rsatiladi, admin tasdiqlagach bazaga o'tadi (Vercel'da `/tmp` ishonchsiz —
shuning uchun jadval).

## Konvensiyalar — buzilmasin

- **`normalize()` — bitta manba fayl:** `src/lib/normalize.ts`. Sayt, import,
  bot AYNAN shu funksiyani ishlatadi. O'zgartirsangiz — importni qayta yuriting.
- **`transliterate()` — faqat ko'rinadigan matn uchun.** Test qotirib qo'ygan:
  `normalize(transliterate(x, 'lat')) === normalize(x)`.
- **STIR — har doim `string`**; `parseStir()` 9 xonaga to'ldiradi.
- **Excel ustun nomlari kirillcha** — `EXCEL_HEADERS` dan nusxa oling.
- **Tuman filtri** har doim `vacancies.district` bo'yicha.
- **SQL faqat `src/lib/queries.ts` da**, qiymatlar faqat `$1, $2` orqali.
  Ommaviy so'rovlar `not is_hidden` bilan; admin `includeHidden: true` beradi.
- **Qidiruv loglari**: `search_logs.query` — foydalanuvchi yozgani, `query_norm` —
  kalit. `logSearch(qRaw, qNorm, n)` faqat 1-sahifa, standart saralash va robot
  bo'lmagan so'rovlarda, `after()` ichida chaqiriladi. Ekranga `getTopSearches().label`
  chiqadi — **normalize kalitini hech qachon transliterate qilmang** (apostroflar
  yo'q: `oqituvchi` → `оқитувчи` noto'g'ri).
- **Raqamlar**: `formatNumber()` guruhlarni U+00A0 bilan ajratadi, `.raqam` `nowrap`.
- Interfeys matni o'zbekcha, "siz"da. Har komponentda `TEXT = { lat, cyr }`.

## Dizayn-tizim (PLAN §5) + mavzu

Ranglar ikki qatlamda (`globals.css`):

- **Brend konstantalari:** `siyoh` `chinni` `chinni-toq` `quyosh` `qogoz` — mavzuga
  bog'liq emas (footer `bg-siyoh text-qogoz` har doim shunday).
- **Semantik tokenlar:** `fon` (sahifa), `yuza` (karta), `matn`, `tosh` (ikkilamchi),
  `chiziq` (chegara), `quyosh-matn`. Komponentlar FAQAT shularni ishlatadi —
  tungi rejimda avtomatik almashadi.

Mavzu: cookie `mavzu` = `light | dark`, yo'q bo'lsa tizim (`prefers-color-scheme`).
Server `<html data-theme>` ni yozadi — sahifa miltillamaydi. `ThemeToggle`
darhol atributni o'zgartiradi, keyin `router.refresh()`.

- `quyosh` bitta ekranda bitta joyda ("N ta o'rin"). "Yangi" nishoni — `chinni`.
- Yirik yakka raqam — `font-display`; `.raqam` (mono, tabular) — ustma-ust raqamlar.
- Animatsiya: hisoblagich, ro'yxat stagger-fade, xarita hover. `prefers-reduced-motion`.
- Xarita poligonlari markazga 3.5% kichraytiriladi ("koshin" effekti).
- Telefonda pastki navigatsiya (`MobileNav`, `md` dan kichikda), `env(safe-area-inset-bottom)`.
- Klaviatura: `/` qidiruvni fokuslaydi (`Shortcuts`).

### Grafiklar

Ranglar `--chart-*` CSS o'zgaruvchilaridan o'qiladi (`useChartTheme`) — ikkala
mavzu uchun validator bilan tekshirilgan: yorug' `#1391A5` / ramp
`#094F5B→#1391A5→#6FBFCE`; tungi `#1FA3B8` / `#1B8799→#4CC4D6→#9AE0EB`.
Bitta qatorli grafik → bitta rang; ta'lim (tartiblangan) → ordinal ramp.

## Foydalanuvchi holati (login yo'q)

`src/lib/saved.ts` — `localStorage`: `saqlangan` (id'lar, `/saqlangan` sahifasi
ularni `/api/v1/vacancies?ids=` orqali oladi) va `korilgan` (bosh sahifadagi
"Yaqinda ko'rilganlar"). Tablar orasida `storage` hodisasi bilan sinxron.

## Admin (`/admin`)

`layout.tsx` — kirish tekshiruvi (HMAC cookie `exp.hmac`, 8 soat, `timingSafeEqual`),
barcha bo'limlar shu qobiqda; har sahifa/action `isAdmin()` ni o'zi ham tekshiradi.
Kirish urinishlari cheklangan (`rate-limit.ts`, xotirada). "Umumiy" bo'limida
**Keshni tozalash** tugmasi — `queries.ts` dagi 10 daqiqalik so'rov keshini
(`revalidateTag('vacancies')`) darhol yangilaydi (skript orqali importdan keyin). Bo'limlar: Umumiy · Import (oldindan ko'rish → tasdiqlash)
· Vakansiyalar (id/matn bo'yicha topish, yashirish/ochish) · Sinonimlar
(natijasiz so'rovlardan taklif, `?term=` bilan oldindan to'ldiriladi) ·
Qidiruv loglari · Telegram (bot holati, webhook tekshiruvi, obunachilar,
bildirishnoma yuborish).

## Telegram bot (PLAN §9)

`src/lib/telegram.ts` (grammY) + `/api/telegram` webhook. Holat DB'da:
`subscriptions.query_norm` bo'sh → kasb kutilmoqda. `/start` → kasb → tuman
(inline tugmalar) → obuna. Oddiy matn → qidiruv (`botSearch`, sayt bilan bitta
normalize/sinonim). `/stop` → `is_active=false`. Botni bloklagan (403) obunadan
chiqariladi. Bildirishnoma: `src/lib/notify.ts` — admin tugmasi va
`npm run notify` bir xil funksiya. Lokalda webhook ishlamaydi (Telegram lokal
manzilga yeta olmaydi) — deploydan keyin `npm run telegram:setup`.

## Ma'lumot haqida bilib qo'yish kerak

2026-07 fayli bo'yicha:

- 15 174 Excel qatori → **12 045** vakansiya yozuvi (3 129 takror birlashtirilgan,
  shu jumladan faqat sanasi farq qilganlar; `sum(positions_count)` = 15 174).
- 1 035 korxona, 12 tuman, 9 kvota toifasi (`src/lib/quotas.ts`).
- Lavozimlarning ~89% i kirill yozuvida. "qorovul": oddiy qidiruv 6 ta,
  `position_search` bo'yicha 62 ta ish o'rni.
- Maosh: 8 939 qatorda raqam; 6 166 "shtat jadvali"; 8 ta >100 mln va 61 ta
  <10 ming rad etilgan (`Aniqlashtirilmoqda`).
- Telefon ustunida bir nechta raqam vergul bilan kelishi mumkin.

## Ma'lum muammo

`xlsx@0.18.5` (CVE-2023-30533). Yumshatish: fayl `{ header: 1 }` massiv
rejimida o'qiladi (`parseWorkbook`), admin yuklash parol bilan himoyalangan.
`exceljs` ga o'tish rejada.

Lighthouse bu muhitda o'lchanmadi (sandbox proksi Chrome'ni to'sadi) —
lokalda `npx lighthouse http://localhost:3000` bilan tekshiring.
