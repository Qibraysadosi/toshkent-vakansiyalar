# PLAN.md — Toshkent vakansiyalar portali (v2)

## Vizyon

Toshkentda ish qidirishning eng qulay tajribasi: 15 000+ rasmiy vakansiya, bir soniyada qidiruv (lotin/kirill farqi yo'q), tumanlar bo'yicha interaktiv xarita, ochiq maosh statistikasi va Telegram orqali yangi vakansiya xabarlari. Ma'lumot manbasi — rasmiy oylik Excel baza.

## Texnologiyalar

- **Frontend/Backend:** Next.js 15 (App Router, Server Components, Server Actions)
- **Baza:** Supabase Postgres (bepul tarif yetadi), `pg_trgm` extension
- **UI:** Tailwind CSS + shadcn/ui + Framer Motion (kam va nishonli animatsiya)
- **Grafiklar:** Recharts (statistika sahifasi)
- **Excel:** `xlsx` (SheetJS), server tomonda
- **OG rasmlar:** `@vercel/og` (har vakansiya uchun dinamik kartochka)
- **Telegram bot:** grammY (6-bosqich)
- **Deploy:** Vercel + GitHub. **Har bosqich oxirida deploy qilinadi** — sayt birinchi haftadan jonli bo'ladi.

---

## 1. Manba fayl strukturasi (REAL — o'zgartirilmasin)

Excel: bitta sheet, 11 ustun, sarlavhalar **kirillcha**:

| Excel ustuni | DB maydoni | Izoh |
|---|---|---|
| Туман (шаҳар) | district | 12 tuman |
| СТИР (ИНН) | stir | 9 xonali, **string** (boshidagi 0 saqlanadi) |
| Ташкилот (корхона) номи | company_name | asosan lotin, ba'zan qisqargan |
| Ташкилот телефон рақами | phone | string |
| Бўлим номи | department | |
| Лавозими | position | **13 524 kirill / 1 735 lotin — aralash!** |
| Вакансия юборилган сана | posted_date | `DD.MM.YYYY` |
| Ставка | stavka | 0.25 / 0.5 / 0.75 / 1.0 / 1.15 / 1.5 |
| Маош | salary / salary_note | pastdagi qoidalar |
| Таълим | education | Олий / Ўрта-махсус / Талаб этилмайди |
| Квота йўналиши | quota | 96% bo'sh, 9 toifa |

## 2. Tozalash qoidalari (import paytida)

1. **Maosh:** raqam bo'lsa → `salary`; matn ("...shtat jadvaliga muvofiq...") bo'lsa → `salary=NULL`, `salary_note='Shtat jadvali bo'yicha'`; `salary > 100 000 000` (bazada 8 ta xato, 1,9 mlrd gacha) → `salary=NULL`, `salary_note='Aniqlashtirilmoqda'`.
2. **Takrorlar:** ~3 000 to'liq bir xil qator = bitta lavozimga bir necha o'rin. Birlashtirib `positions_count` yoziladi, UI'da "3 ta o'rin" badge.
3. **STIR:** `stir.padStart(9,'0')`.
4. Trim, ortiqcha qo'shtirnoqlarni olib tashlash.

## 3. Qidiruv tizimi

### 3.1 Normallashtirish (poydevor)

Isbot: "qorovul" — bazada 62 ta, oddiy qidiruv 5 tasini topadi (qolgani "Қоровул").

`normalize(text)` funksiyasi (TS'da yoziladi, import va qidiruvda BIR XIL ishlatiladi):
- Kirill→lotin: а→a б→b в→v г→g д→d е→e ё→yo ж→j з→z и→i й→y к→k л→l м→m н→n о→o п→p р→r с→s т→t у→u ф→f х→x ц→ts ч→ch ш→sh э→e ю→yu я→ya **ў→o' қ→q ғ→g' ҳ→h** ъ→'
- lowercase
- barcha apostrof variantlari (' ' ʻ ʼ `) olib tashlanadi → "o'qituvchi" = "oqituvchi" = "Ўқитувчи"

`position_search`, `company_search` ustunlariga shu shaklda yoziladi. Qidiruv: `pg_trgm` GIN index + `ILIKE '%q%'`, natija kam bo'lsa `similarity()` bilan fuzzy fallback (xato yozilgan so'zlar uchun).

### 3.2 Sinonimlar (kuchaytirish)

`synonyms` jadvali, boshlang'ich to'plam (bazada ruscha lavozimlar ham bor):
сторож→qorovul · дворник→farrosh · уборщица/уборщик→farrosh · водитель→haydovchi · повар→oshpaz · медсестра→hamshira · грузчик→yuk ortuvchi · охранник→qoriqchi/qorovul · учитель→o'qituvchi · воспитатель→tarbiyachi. Qidiruvda so'rov sinonimi bo'lsa, ikkalasi bo'yicha qidiriladi. Admin paneldan to'ldirib boriladi.

### 3.3 Autocomplete + qidiruv analitikasi

- Yozayotganda (debounce 250ms) top-6 mos lavozim + har birida nechta vakansiya borligi.
- Har qidiruv `search_logs`ga yoziladi (query_norm, results_count) → bosh sahifada "Ko'p qidirilayotganlar" chiplari, admin'da talab analitikasi (qaysi kasblar qidirilyapti — kontent/reklama uchun oltin ma'lumot).

## 4. Baza sxemasi

```sql
create table companies (
  stir text primary key,
  name text not null,
  name_search text not null,
  phone text,
  district text,
  official_name text, address text, activity_type text,
  registered_date date, status text, enriched_at timestamptz
);

create table vacancies (
  id bigserial primary key,
  stir text references companies(stir),
  district text not null,
  department text,
  position text not null,
  position_search text not null,
  posted_date date,
  stavka numeric(4,2),
  salary numeric,
  salary_note text,
  education text,
  quota text,
  positions_count int default 1,
  views int default 0,
  import_batch text not null
);

create table synonyms (term text primary key, canonical text not null);
create table search_logs (id bigserial primary key, query_norm text, results_count int, created_at timestamptz default now());
create table subscriptions (id bigserial primary key, tg_chat_id bigint, query_norm text, district text, created_at timestamptz default now());
create table import_history (batch text primary key, rows_read int, rows_merged int, errors jsonb, created_at timestamptz default now());

create extension if not exists pg_trgm;
create index idx_vac_pos_trgm on vacancies using gin (position_search gin_trgm_ops);
create index idx_vac_district on vacancies(district);
create index idx_vac_stir on vacancies(stir);
create index idx_vac_salary on vacancies(salary);
```

---

## 5. DIZAYN-TIZIM

**Yo'nalish:** "Toshkent koshinlari" — davlat ma'lumotiga ishonch + shahar identiteti. Generik indigo-SaaS emas, AI-standart krem+terrakota ham emas: O'zbek chinni-koshin ko'ki asosida sokin, aniq, professional til.

### 5.1 Ranglar (Tailwind tokenlar)

| Token | Hex | Vazifasi |
|---|---|---|
| `siyoh` | `#10233A` | asosiy matn, footer, tungi elementlar |
| `chinni` | `#1391A5` | asosiy aksent: linklar, CTA, faol filtr (koshin ko'ki) |
| `chinni-toq` | `#0C6B7A` | hover, bosilgan holat |
| `quyosh` | `#EBA937` | ikkilamchi urg'u: "3 ta o'rin", "Yangi" badge (kam ishlatiladi) |
| `qogoz` | `#F7F4EE` | sahifa foni (iliq oq) |
| `tosh` | `#66707D` | ikkilamchi matn, meta |

Qoida: bitta ekranda `quyosh` faqat bitta joyda. Maosh ko'rsatilmagan holat ("Shtat jadvali bo'yicha") — `tosh` rangli muted badge, hech qachon aksent emas.

### 5.2 Tipografika (hammasi Google Fonts, to'liq kirill+lotin)

| Rol | Shrift | Sabab |
|---|---|---|
| Display (logo, hero, bo'lim sarlavhalari) | **Unbounded** 500–700 | xarakterli, zamonaviy; faqat yirik o'lchamda, kam joyda |
| Matn/UI | **Golos Text** 400–600 | aynan davlat xizmatlari o'qiluvchanligi uchun yaratilgan, kirillda mukammal |
| Ma'lumot (maosh, STIR, telefon) | **IBM Plex Mono** 500, tabular | raqamlar ustma-ust tekis turadi, "reyestr" hissi |

Shkala: 14 / 16 (asos) / 18 / 22 / 28 / 40 / 56. Satr balandligi matnda 1.6.

### 5.3 Imzo element (signature)

**Interaktiv Toshkent tumanlar xaritasi** — bosh sahifada soddalashtirilgan SVG (12 tuman, qo'lda chizilgan sodda poligonlar yetadi, geografik aniqlik shart emas). Har tumanda jonli vakansiya soni; ustiga borganda `chinni` bilan yonadi, bosilganda o'sha tuman ro'yxatiga o'tadi. Mobilda xarita o'rniga 12 ta chip-grid (soni bilan). Bu — saytning esda qoladigan yagona "boldness" nuqtasi; qolgan hamma narsa sokin va intizomli.

Yordamchi moment: hero qidiruv maydoni ostida jonli hisoblagich — "15 174 ta ish o'rni ichidan qidirilmoqda" (import'dagi real son, count-up animatsiya bilan bir marta).

### 5.4 Komponentlar

- **Vakansiya kartasi:** lavozim (Golos 600) → korxona + tuman (tosh) → pastda maosh (Plex Mono, yirik) yoki muted badge → o'ng yuqorida "N ta o'rin" (quyosh) faqat N>1 bo'lsa. Butun karta bosiladi, hover'da yengil ko'tarilish (2px, soya).
- **Filtr paneli:** desktop'da chap ustun, mobilda pastdan chiqadigan sheet ("Filtrlar (3)" tugma). Faol filtrlar ro'yxat tepasida chip bo'lib turadi, ✕ bilan olib tashlanadi.
- **Skeleton:** kartalar shaklida shimmer; spinner ishlatilmaydi.
- **Bo'sh holat:** "Hech narsa topilmadi. Boshqacha yozib ko'ring — masalan, 'qorovul' o'rniga 'qoriqchi'." + filtrlarni tozalash tugmasi. (Xato holatlari ham yo'l ko'rsatadi, kechirim so'ramaydi.)

### 5.5 Harakat va sifat qoidalari

- Animatsiya faqat: hisoblagich count-up (1 marta), ro'yxat yangilanishida 150ms stagger-fade, xarita hover. Boshqa joyda yo'q. `prefers-reduced-motion` hurmat qilinadi.
- Klaviatura fokus halqalari ko'rinadi (`chinni` outline). Kontrast WCAG AA.
- Matn ohangi: sodda, "siz"da, aktiv fe'llar ("Qidirish", "Filtrlarni tozalash", "Raqamga qo'ng'iroq qilish"). Tugma nomi oqibatida ham saqlanadi.

---

## 6. Sahifalar

| Yo'l | Vazifasi |
|---|---|
| `/` | Hero-qidiruv (jonli hisoblagich) + tumanlar xaritasi + "Ko'p qidirilayotganlar" + top kategoriyalar |
| `/vakansiyalar` | Ro'yxat + filtrlar (tuman, ta'lim, maosh oralig'i, stavka, kvota, "faqat maoshi ko'rsatilganlar") + saralash (yangi / maosh ↑↓ / mashhur). Hammasi URL query'da — ulashsa bo'ladi |
| `/vakansiya/[id]` | To'liq ma'lumot, `tel:` tugma, korxona kartasi, "Telegramda ulashish", o'xshash vakansiyalar, views++ |
| `/korxona/[stir]` | Korxona: boyitilgan ma'lumot + barcha vakansiyalari + orginfo.uz havolasi |
| `/tuman/[slug]` | 12 SEO sahifa: tuman statistikasi + vakansiyalari |
| `/statistika` | Ochiq analitika: tumanlar bo'yicha o'rtacha maosh, top-10 kasb, ta'lim taqsimoti (Recharts). Matbuot/ijtimoiy tarmoq uchun ulashiladigan sahifa |
| `/admin` | Parol (env) bilan: import, dashboard, sinonimlar, qidiruv loglari |

**Alifbo tugmasi (header'da): Lotin / Кирилл.** Ma'lumot bazada qanday bo'lsa shunday turadi, ekranga chiqarishda tanlangan alifboga transliteratsiya qilinadi (normalize funksiyasining aksi). O'zbek auditoriya uchun katta qulaylik.

## 7. Import mexanizmi

- `/admin/import`: `.xlsx` yuklash → ustunlar 1-bo'lim jadvali bo'yicha o'qiladi → tozalash → `companies` upsert → `vacancies` yangi batch bilan insert → eski batch o'chiriladi (to'liq almashtirish; `companies` boyib boraveradi).
- Yakunda hisobot `import_history`ga: o'qildi / birlashtirildi / xatolar (jsonb). Admin'da tarix jadvali.
- Import tugagach — obunachilarga Telegram xabarlari (6-bosqich ulanadi).
- Birinchi to'ldirish: `scripts/import.ts` lokal skript (Claude Code ishga tushiradi).

## 8. Korxona boyitish

1 035 unikal STIR — bir martalik ish.

- **Taqiq:** orginfo.uz jonli parsing (kuniga 50 ta limit — bloklanadi).
- **Manba tekshiruvi (shu tartibda):** stat.uz KTYADR reyestri (orginfo ham shundan oladi), data.egov.uz datasetlari. Avval bitta STIR bilan sinov: qaysi endpoint ochiq javob qaytaradi.
- Skript: 1 req/sek, xatoda davom etadi, natija `companies`ga, oxirida hisobot.
- **Zaxira:** manba topilmasa — Excel'dagi ma'lumot + orginfo.uz tashqi havolasi. Sayt bunsiz ham to'liq ishlaydi.

## 9. Telegram bot va obuna

- grammY bot: `/start` → kasb so'zi + tuman tanlash → `subscriptions`ga yoziladi.
- Har oylik importdan keyin: yangi mos vakansiyalar obunachilarga yuboriladi (har biriga sayt havolasi bilan).
- Botda oddiy qidiruv ham ishlaydi (normalize + sinonimlar — sayt bilan bitta funksiya).
- Saytda "Yangi vakansiyalardan xabardor bo'ling" CTA → botga deep-link.

## 10. SEO, tezlik, ishonchlilik

- Server-render + ISR (`revalidate` — ro'yxatlar 1 soat, detallar 24 soat).
- `JobPosting` schema.org har vakansiyada → Google Jobs'ga chiqish imkoni; dinamik `sitemap.xml` (bo'laklarga bo'lingan), `robots.txt`.
- `@vercel/og`: ulashilganda lavozim + maosh + tuman brendli kartada ko'rinadi (Telegramda chiroyli preview).
- PWA: manifest + ikonlar — telefonga o'rnatib qo'yish mumkin.
- Qidiruv API'ga oddiy rate limit (IP bo'yicha, in-memory yoki Upstash).
- Maqsad: Lighthouse mobile 90+, LCP < 2.5s. Rasmlar deyarli yo'q — asosiy og'irlik shriftlar (subset + `display: swap`).
- `/api/v1/vacancies` — hujjatlashtirilgan JSON endpoint (kelajakdagi mobil ilova uchun tayyor eshik).

---

## 11. Bosqichlar (Claude Code sessiyalari)

Har bosqich = alohida sessiya. Oxirida: tekshiruv o'tdi → deploy → shu faylda ✅ + qisqa status.

1. **Poydevor:** repo, Next.js + Supabase, sxema, `normalize()` + testlari, `scripts/import.ts`. ✅ Tekshiruv: bazada ~12 ming birlashgan qator, "qorovul" SQL'da 60+ topadi.
2. **MVP UI:** bosh sahifa (soddalashtirilgan), ro'yxat + filtrlar, vakansiya sahifasi, qidiruv v1. ✅ Tekshiruv: telefonda "qorovul" → 60+ natija; deploy jonli.
3. **Dizayn-tizim to'liq:** 5-bo'lim tokenlari, shriftlar, kartalar, tumanlar xaritasi (signature), skeleton/bo'sh holatlar. ✅ Tekshiruv: skrinshot 5-bo'limga mos, xarita bosilganda filtr ishlaydi.
4. **Qidiruv v2 + alifbo:** autocomplete, sinonimlar, search_logs, "ko'p qidirilayotganlar", Lotin/Кирилл tugmasi. ✅ Tekshiruv: "сторож" ham qorovullarni topadi; kirill rejimda butun sayt kirillda.
5. **Admin:** parol, import UI + tarix, dashboard (loglar, sifat hisoboti), sinonim boshqaruvi. ✅ Tekshiruv: yangi oy faylini yuklash eski batchni almashtiradi.
6. **Boyitish + statistika:** manba sinovi, 1 035 STIR skripti, korxona sahifalari, `/statistika`. ✅ Tekshiruv: kamida 80% korxinada qo'shimcha ma'lumot bor.
7. **Telegram + sayqal:** bot, obuna, import-trigger xabarlar, OG rasmlar, PWA, Lighthouse 90+, domen. ✅ Tekshiruv: obuna bo'lib, test importdan xabar keladi.

## 12. Claude Code uchun eslatmalar

- Sessiya boshida shu faylni o'qi. Bosqichdan tashqariga chiqma — g'oya bo'lsa, "Keyinga" bo'limiga yozib qo'y.
- `CLAUDE.md` yarat: buyruqlar, env var'lar (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `TG_BOT_TOKEN`), konvensiyalar.
- STIR hamma joyda string. Sana: `DD.MM.YYYY`. Excel ustun nomlari kirillcha — nusxalab ishlat.
- `normalize()` — bitta manba fayl (`lib/normalize.ts`), sayt + bot + import bir xil ishlatadi. Unit-testlar shart ("Қоровул"="qorovul"="Qorovul").

## Keyinga (backlog — hozir qilinmaydi)

- Admin kirish cheklovi hozir xotirada (`rate-limit.ts`, `hitBucket`) — Vercel'da
  har instans / sovuq start uchun alohida hisoblanadi. Barqaror variant: bazada
  `login_attempts` jadvali (ip, urinishlar, oxirgi vaqt) yoki Upstash.

- Rezyume yuklash / ish beruvchi kabineti
- Ko'p til (rus interfeysi)
- Supabase Auth bilan admin
- Maosh tarixi (oyma-oy o'zgarish grafigi — 2-3 importdan keyin ma'noli bo'ladi)

---

## Bosqichlar holati

| # | Bosqich | Holat |
|---|---|---|
| 1 | Poydevor | ✅ |
| 2 | MVP UI | ✅ |
| 3 | Dizayn-tizim + xarita | ✅ (+ tungi rejim, mobil navigatsiya) |
| 4 | Qidiruv v2 + alifbo | ✅ |
| 5 | Admin | ✅ (bo'limlar, ikki bosqichli import, yashirish) |
| 6 | Boyitish + statistika | ◐ statistika va korxona sahifalari tayyor; boyitish manbasi tasdiqlanmagan |
| 7 | Telegram + sayqal | ◐ bot, webhook, bildirishnoma kodi tayyor — token kerak; OG/PWA/sitemap tayyor |

Hammasi lokalda ishlaydi: `npm run db:up && npm run db:schema && npm run import -- data/fayl.xlsx && npm run dev`.

### Tekshiruv natijalari (2026-07 fayli, 15 174 qator)

| Mezon | Kutilgan | Chiqdi |
| --- | --- | --- |
| Birlashgan qatorlar | ~12 ming | **12 045** (3 129 takror; `sum(positions_count)` = 15 174) |
| `"qorovul"` SQL'da | 60+ | **62 ta ish o'rni**. Normalize'siz — 6 ta |
| Korxonalar / tumanlar | — / 12 | 1 035 / 12 |
| Qayta import | id saqlanadi | 0 ta o'chdi, id oralig'i o'zgarmadi |
| Ekranlar | 360–1440, yorug'/tungi | gorizontal scroll yo'q, konsol xatosi yo'q |

### PLAN'dan tashqari qo'shilganlar

- **Barqaror id'lar** — `fingerprint` bo'yicha upsert (sana kirmaydi). Saqlangan
  ro'yxat, ulashilgan havolalar, Telegram xabarlari va Google indeksi oydan oyga
  buzilmaydi. Yangi faylda yo'q vakansiyalar tegilgan id'larga qarab o'chadi.
- **Tungi rejim** (tizim / yorug' / tungi, cookie, miltillamaydi) va semantik
  rang tokenlari; grafik ranglari ikkala mavzu uchun validatordan o'tgan.
- **Mobil**: pastki navigatsiya, safe-area, `clamp()` sarlavha, filtr sheet.
- **Saqlangan vakansiyalar** va **yaqinda ko'rilganlar** — `localStorage`,
  login yo'q. `/saqlangan` sahifasi.
- "Yangi" nishoni (bazadagi eng so'nggi sanadan 2 kun ichida), kvota toifalari
  bo'yicha filtr (9 toifa), havolani nusxalash, `/` tugmasi qidiruvga.
- 404 / xato / yuklanish sahifalari (skeleton).
- Admin: bo'limlar, import oldindan ko'rish → tasdiqlash (`import_staging`),
  vakansiyani yashirish/ochish, natijasiz so'rovlardan sinonim taklifi,
  Telegram bo'limi (bot holati, webhook, obunachilar, bildirishnoma).
- Telegram bot (grammY, webhook) + `npm run notify` + `npm run telegram:setup`.
- `/api/v1/vacancies?ids=` — saqlanganlar uchun.

### 2026-09 audit va tuzatishlar

To'liq audit: 9 yo'nalish (runtime, xavfsizlik, ma'lumot, frontend, i18n, SEO/tezlik,
Telegram, a11y, ops) → 105 topilma, 49 tasi 3 mustaqil tekshiruvchi tomonidan
tasdiqlandi, qolganlari qo'lda ko'rib chiqildi. Tuzatilganlar:

- **Qidiruv**: sahifa raqami natijadan oshsa oxirgi sahifaga qisqartiriladi
  (ilgari total=0 va noto'g'ri fuzzy), so'rov uzunligi 100, `search_logs.query`
  (asl matn) — chiplar endi to'g'ri kirillcha, log faqat 1-sahifa/standart
  saralash/robot bo'lmagan so'rovda `after()` ichida, 180 kunlik saqlash.
- **Xavfsizlik**: admin cookie muddatli (`exp.hmac`, 8 soat), kirish urinishlari
  cheklovi, JSON-LD ekranlash (`</script>` chiqib ketmaydi), vakansiya id
  tekshiruvi (500 → 404), OG rasm yashirin vakansiyani bermaydi, Telegram
  webhook secret'siz 503 (ilgari hammani qabul qilardi), RLS `not is_hidden`.
- **Import/bildirishnoma**: `first_batch` (faqat insert'da) — ko'chib o'tgan
  vakansiya har oy "yangi" deb yuborilmaydi; bildirishnoma 45 s byudjet bilan
  bo'lib-bo'lib, `subscriptions.last_batch` bilan idempotent; `parseDate`
  yaroqsiz sanani rad etadi (ilgari butun import yiqilardi); `db:schema`/`db:reset`
  psql'siz (`scripts/db.ts`), `import_staging` ham reset bo'ladi.
- **Transliteratsiya**: yo'q → йўқ, ЛАБОРАТОРИЯ → LABORATORIYA, oʼ/o´ apostroflar,
  ketsa → кетса, lotin brendlar (Coca-Cola, Windows) o'zgarmaydi.
- **UI / a11y / i18n**: `font-500/600/700` tokenlari (sarlavhalar 400 da chiqardi),
  kontrast (chinni #0D7A8C, `chinni-ustida`, `tosh` to'liq), SearchBox combobox
  (aria-activedescendant, Back/Forward'da sinxron), filtr sheet (Escape, fokus,
  scroll lock, safe-area), 44px teginish maydonlari, dl tartibi, live region,
  aria-current, xarita `role=group`, kirillcha "сўм"/"ставка"/oy nomlari/chiplar,
  error sahifasi ikki alifboda, StatsCharts hydration (`matchMedia`), CountUp
  StrictMode, raqamlarda NBSP, `latin-ext` shrift yuklanmaydi.
- **Vercel/ops**: build `DATABASE_URL`'siz o'tadi, `DATABASE_URL` yo'q bo'lsa
  `SetupNotice` yo'riqnomasi, 4 MB yuklash chegarasi (Vercel 4,5 MB), so'rov
  keshi (`unstable_cache`, 10 daqiqa, import/yashirish/"Keshni tozalash" da `revalidateTag`),
  `NEXT_PUBLIC_SITE_URL` shart emas, ESLint 9, bulutli sessiya uchun SessionStart
  hook (`.claude/hooks/session-start.sh`).

### Qolgan ish (kalit kerak)

- **Boyitish manbasi**: `npm run enrich:probe` ni O'zbekistondan ishga tushiring.
- **Telegram**: @BotFather'dan token → `TG_BOT_TOKEN`, `TG_WEBHOOK_SECRET` →
  deploydan keyin `npm run telegram:setup`.
- Deploy: Vercel loyihasi `toshkent-vakansiyalar` yaratilgan (Root Directory
  `portal`, `ADMIN_PASSWORD`/`TG_WEBHOOK_SECRET` o'rnatilgan). **Sizdan:**
  Supabase loyihasi → `schema.sql` → `DATABASE_URL` (Transaction pooler) →
  Vercel env → Redeploy; Vercel'ga GitHub ilovasini ulash (har push'da deploy).
- Domen, Lighthouse o'lchovi (sandbox'da o'lchanmadi).

### PLAN'dan chetlanishlar

1. **Maoshga pastki chegara** (`< 10 000 so'm` → "Aniqlashtirilmoqda") — 61 ta
   texnik xato qator. `MIN_PLAUSIBLE_SALARY`.
2. **Baza qatlami `pg`, `supabase-js` emas** — bitta `DATABASE_URL`, to'liq SQL.
3. **shadcn/ui ishlatilmadi** — komponentlar tokenlarga to'g'ridan-to'g'ri yozildi.
4. **Takrorlarni birlashtirish sanasiz** — PLAN §2.2 "to'liq bir xil qator"
   degan; endi faqat sanasi farq qilganlar ham birlashadi (12 163 → 12 045).
   Sabab: barqaror id. Ish o'rni yig'indisi o'zgarmaydi (15 174).
