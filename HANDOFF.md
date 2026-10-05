# HANDOFF — sessiyalar orasidagi xotira

> Bu fayl oldingi Claude Code sessiyalaridan (2026-08-24 … 2026-10-05) qolgan to'liq
> kontekst. Xom transkript (~28 MB, asosan vosita chiqishlari) o'rniga muhim hamma narsa
> shu yerda jamlangan; foydalanuvchining barcha xabarlari 12-bo'limda so'zma-so'z,
> Claude javoblari qisqacha.
>
> **Yangi sessiya uchun:** shu faylni, `portal/CLAUDE.md` va `portal/PLAN.md` ni o'qing.
> Foydalanuvchiga 3–5 qatorda "kontekst tushunarli" xulosasini bering (loyiha, hozirgi
> holat, ochiq masala) va so'ragan ishini qiling. Muhim yangi qaror, infratuzilma
> o'zgarishi yoki yangi ochiq masala bo'lsa — shu faylni ham yangilab, commit qiling.

---

## 1. Foydalanuvchi va muloqot uslubi

- **Ism:** Shohrux (claude.ai profili). GitHub hisobi — **Qibraysadosi**.
- **Til:** o'zbekcha, lotin yozuvida. Foydalanuvchi qisqa, ba'zan imloviy xatolar
  bilan yozadi — mazmunini tushunib, o'zbekcha javob bering.
- **Daraja:** dasturchi emas. Git, terminal, Vercel, Supabase nima ekanini bilmaydi.
  Har qadamni sodda, raqamlangan ro'yxat bilan tushuntiring; atamani birinchi
  ishlatganda bir og'iz izohlang.
- **Qurilmalar:** Windows kompyuter (Chrome, Git Bash o'rnatilgan) va telefon (Claude
  ilovasi). Asosiy maqsad: kompyuter yo'qligida telefondan Claude Code orqali saytni
  tuzatib turish.
- **Kutilgan uslub (oldingi sessiyada shunday ishlangan):**
  - Javobni natijadan boshlang. Qisqa jumlalar, raqamlar — jadvalda.
  - Ishni oxirigacha o'zingiz qiling. Oddiy, qaytariladigan ishlar uchun ruxsat
    so'ramang — foydalanuvchi "allow/deny deb so'rama, hammasiga allow" degan.
  - Qaytarib bo'lmaydigan ish (o'chirish, production ma'lumotiga xavf) — avval tasdiq.
  - Foydalanuvchi o'zi qilishi kerak bo'lgan qadamlarni oxirida aniq ro'yxat qiling.
  - Cheklov yoki o'z xatoingiz bo'lsa — rostini qisqa ayting va yechim bering.
  - Savol bo'lsa (tahlil so'ralsa) — tahlil bering, so'ralmagan kod o'zgarishi qilmang.
- **Brauzer ishlari** (Vercel, Supabase, saytning `/admin` paneli): bulut sessiyasi
  foydalanuvchi brauzeriga ulana olmaydi. Foydalanuvchida **Claude in Chrome**
  kengaytmasi bor — unga **inglizcha, batafsil, qadamma-qadam topshiriq** yozing (kod
  blokida). Foydalanuvchi nusxalab kengaytmaga tashlaydi, natijani qaytaradi.
  Kengaytma parol kiritmaydi va fayl tanlamaydi: topshiriqda o'sha joylarda
  "STOP and ask the user" deb yozing, parolni foydalanuvchiga chatda alohida bering.
  Topshiriqda kutilgan qiymatlar, to'xtash shartlari va "boshqa sozlamalarga tegma"
  qoidasi bo'lsin. Namuna — 8-bo'lim.
- **Git Bash:** paste — o'ng tugma → Paste yoki Shift+Insert (Ctrl+V ishlamaydi).
  Buyruqlarni bittadan bering.
- **Ruxsatlar:** foydalanuvchi "allow/deny deb so'rama" degan. Claude o'z ruxsat
  sozlamalarini o'zgartira olmaydi; foydalanuvchiga `.claude/settings.json` ga
  `permissions` (`allow` ro'yxati, `defaultMode`) qo'shish yo'li ko'rsatilgan — hali
  qo'shilmagan (faylda faqat `hooks`). So'ralsa, buni o'zi qo'shishi kerakligini ayting.

**Namuna javob** (Qibray importi tekshirilgandan keyin — shu ohangda gaplashing):

> Qibray saytga qo'shildi va to'g'ri ishlayapti. Skrinshot va kengaytma hisoboti
> kutilgan qiymatlar bilan to'liq mos:
>
> | Tekshiruv | Natija |
> | --- | --- |
> | Qibray vakansiyalari | 880 ta natija |
> | Qibray ish o'rinlari | 1 042, o'rtacha maosh 1 863 244 so'm |
> | Toshkent tumanlari | o'zgarmagan, jami yana 15 174 |
>
> Demak Qibray importi Toshkent ma'lumotiga tegmadi, faqat yangi hudud qo'shildi.
> Keyingi oylarda ikkala faylni ham `/admin` → Import orqali, istalgan tartibda
> yuklaysiz. Har biri faqat o'z hududini yangilaydi.

## 2. Loyiha

**Toshkent vakansiyalar portali** — rasmiy oylik bo'sh ish o'rinlari Excel bazasidan
qurilgan qidiruv sayti: lotin/kirill farqisiz qidiruv, tumanlar xaritasi, filtrlar,
ochiq statistika, korxona va tuman sahifalari, saqlanganlar, admin panel (import,
yashirish, sinonimlar, loglar, keshni tozalash), Telegram bot kodi (hali ulanmagan).

| | |
| --- | --- |
| Jonli sayt | **https://kasbegasi.vercel.app** (2026-10-05 dan asosiy). Eski `toshkent-vakansiyalar-steel.vercel.app` ham ishlaydi (canonical → yangi). Keyin — `kasbegasi.uz` (3-bo'lim, Domen) |
| Admin | https://kasbegasi.vercel.app/admin — parol Vercel'dagi `ADMIN_PASSWORD` |
| Kod | GitHub `Qibraysadosi/toshkent-vakansiyalar`, shox `main` |
| Loyiha papkasi | `portal/` — Next.js 15, React 19, TypeScript, Tailwind 4, `pg`, Supabase Postgres |
| Ildizdagi `src/`, `server/`, `index.html`, `vite.config.js` | eski **Fintellect** ilovasi — boshqa loyiha, tegilmaydi |

Texnik qoidalar: `portal/CLAUDE.md` (majburiy). Reja va holat: `portal/PLAN.md`.
Foydalanuvchi qo'llanmasi: `portal/README.md`.

## 3. Infratuzilma va hisoblar

| Qism | Qayerda | Izoh |
| --- | --- | --- |
| GitHub | `Qibraysadosi/toshkent-vakansiyalar` — **ochiq (public)**, hamma o'qiy oladi | Claude GitHub App shu hisobda. `main` ga push → avtomatik production deploy (1–2 daqiqa). **Yopiq (private) qilinmasin:** Vercel Hobby yopiq repoda faqat hisob egasining commitlarini joylaydi, Claude commitlari bloklanadi |
| Hosting | Vercel, hisob **"qibraysadosi's projects"** (Hobby), loyiha `toshkent-vakansiyalar` | Root Directory `portal`, Production Branch `main` |
| Vercel env | `ADMIN_PASSWORD`, `TG_WEBHOOK_SECRET`, `DATABASE_URL` (sensitive); `NEXT_PUBLIC_SITE_URL` = `https://kasbegasi.vercel.app` (plain, production, id `JIl4bvfz3lZJN73A`) | Maxfiy qiymatlar faqat Vercel'da — repoga va bu faylga yozilmaydi. `NEXT_PUBLIC_SITE_URL` — sitemap, robots, canonical, OG, bot havolalari; o'zgartirilsa — production qayta deploy (build vaqtida o'qiladi). Bo'sh qolsa Vercel eng qisqa custom domenni oladi — DNS ishlamayotgan domen bo'lsa havolalar buziladi |
| Vercel MCP (Claude) | konnektor **qibraysadosi** hisobida: team `team_cd8jkmTJKzsOSHm0p40XX7gA`, loyiha `prj_u7IanQdim1hdif8qSSXtfQTPg3y7` | Claude o'zi: domen qo'shish, env, deploy (`create_deployment` gitSource main), loglar. Mavjud domenni yo'naltirish (PATCH) uchun vosita yo'q — Vercel UI yoki kod. `web_fetch_vercel_url` — saytni Vercel orqali ochish |
| Claude muhiti | **"Claude"** (`env_018bZDRVWrSDeHQGzQR7GUbM`) — sessiyalar shu muhitda. Network access: **to'liq ochiq** (2026-10-05). Environment variables: `PROD_ADMIN_PASSWORD` — production `/admin` paroli | 2026-10-05 da sozlandi va tekshirildi: sessiyadan sayt ochiladi, `/admin` ga kirish ishlaydi. Tahrirlash (Desktop ilova): chap paneldagi repo yonidagi **+** → xabar maydonidagi muhit tanlagichi → **Cloud** → **Claude** ustida ⚙. Yana ikkita **"Default"** muhit bor — ishlatilmaydi (birida xato bilan xuddi shu sozlamalar saqlangan, zarari yo'q). Tarmoq o'zgarishi ~1 daqiqada amalga oshadi; o'zgaruvchilar — sessiya qayta ishga tushganda yoki yangi sessiyada. Parolni chatga yozdirmang |
| Baza | Supabase (East US), **Transaction pooler**, port 6543 | `portal/supabase/schema.sql` qo'llangan. Baza paroli foydalanuvchida |
| Telegram bot | sozlanmagan | `TG_BOT_TOKEN` yo'q |
| Domen | **`kasbegasi.uz`** — 05.10.2026 da ro'yxatdan o'tgan (OOO Arsenal D), NS `ns1/ns2.vercel-dns.com`, WHOIS holati "Активацияни кутиш" (DNS hali NXDOMAIN). Vercel loyihasiga qo'shilgan, `www` → apex 308 | Routine `trig_01TgaZwXSHCgn5GxidaEZP8p` (shu sessiyaga, har 3 soatda): ishga tushsa `NEXT_PUBLIC_SITE_URL` → `https://kasbegasi.uz`, deploy, hujjatlar, xabar, Routine o'chiriladi; 2026-10-12 gacha. Hisobdagi `uzeida.uz` — boshqa loyiha uchun, tegilmaydi |

**Eskirgan, ishlatilmaydigan narsalar:**

- GitHub `Jhonjonsin2006/fintellect` — foydalanuvchiniki emas, yozish huquqi yo'q.
  Loyiha avval shu yerda edi; hamma kod endi yangi repoda.
- Vercel jamoasi **"jhon's projects"** (`team_kkQB3UmRl9AWHU6iUsvr8LaH`) dagi bo'sh
  `toshkent-vakansiyalar` loyihasi (`prj_jeI1M8T8UohfSrfMVMtFpqAsPqcb`) — qoldiq,
  foydalanuvchi xohlasa o'chiradi.
- Vercel konnektori ilgari shu "jhon's projects" ga ulangan edi; 2026-10-05 da
  tekshirilganda — qibraysadosi hisobida (3-bo'lim jadvali), jonli loyiha ko'rinadi.
- `ADMIN_PASSWORD` va `TG_WEBHOOK_SECRET` ni oldingi sessiya yaratgan va chatda
  ko'rsatgan — almashtirish tavsiya qilingan (Vercel → Settings → Environment
  Variables → yangi qiymat → Redeploy). Bot ulashdan oldin webhook secret ham yangilansin.
  2026-10-05 da foydalanuvchi admin parolini yana chatga yozdi — almashtirish yanada zarur.
- Foydalanuvchining Vercel hisobida boshqa loyiha ham bor (`uztira-site`) — tegilmaydi.
- `toshkent-vakansiyalar.vercel.app` nomi band bo'lgani uchun Vercel `-steel` qo'shgan.

## 4. Bazadagi ma'lumot (2026-10-04)

| Fayl / batch | Excel qatorlari = ish o'rinlari | Vakansiya yozuvi | Korxona |
| --- | --- | --- | --- |
| Toshkent shahri, `2026-10` | 15 174 | 12 045 | 1 035 |
| Qibray tumani, `2026-10-qibray` (sentabr holati) | 1 042 | 880 | 127 |
| **Jami** | **16 216** | **12 925** | **1 162** |

Tumanlar bo'yicha ish o'rinlari: Olmazor 2 985, Mirobod 2 412, Shayxontohur 2 223,
Mirzo Ulug'bek 1 646, Yashnobod 1 240, Yunusobod 1 233, Qibray 1 042, Chilonzor 986,
Yakkasaroy 734, Yangihayot 699, Uchtepa 521, Sergeli 291, Bektemir 204.

2026-10-05 da jonli sayt va admin panelda tekshirildi — hammasi shu jadvaldagidek.
Admin "Sifat hisoboti": maoshi yo'q 4 933 (38%), maoshi aniqlashtirilmoqda 65, sanasi va
bo'limi yo'q 880 (Qibray), kvota yo'nalishida 594, lavozimi kirillda 11 415 (88%).
Telegram obunachi 0. Natijasiz qidiruvlar yo'q.

Asl Excel fayllar repoda yo'q (shaxsiy ma'lumot) — foydalanuvchi kompyuterida.
Takrorlar `fingerprint` bo'yicha birlashadi, `positions_count` ish o'rinlarini saqlaydi.

## 5. Har oylik yangilash (import)

1. `/admin` → **Import** → batch nomi (standart: joriy oy) → Excel fayl → **Oldindan ko'rish**.
2. Hisobotni tekshirish → **Tasdiqlash — N ta yozuv**.
3. Toshkent va Qibray fayllari alohida, istalgan tartibda yuklanadi:
   - shahar fayli faqat 12 shahar tumanini almashtiradi, Qibray fayli faqat Qibrayni
     (`importScope` — biri ikkinchisini o'chirmaydi);
   - faqat Qibraydan iborat faylda batch nomiga o'zi `-qibray` qo'shiladi;
   - shahar faylida biror shahar tumani yo'q bo'lsa — sariq "Diqqat" ogohlantirishi
     chiqadi (o'sha tumandagi vakansiyalar o'chadi).
4. Admin orqali fayl ≤ 4 MB (Vercel cheklovi). Kattarog'i — kompyuterda `portal/.env.local`
   ga Supabase `DATABASE_URL` yozib, `npm run import -- fayl.xlsx`.
5. Ommaviy sahifalar 10 daqiqa keshlanadi; admin importi keshni o'zi tozalaydi.
   Skript orqali importdan keyin: `/admin` → **Keshni tozalash**.

**Qibray fayl formati boshqacha:** 1-qatorda nom ("Қибрай туман 2026 йилнинг СЕНТЯБР ойи
… МАЪЛУМОТ"), sarlavha 2-qatorda; ustunlar: `Т/Р, Туман (шаҳар), СТИР (ИНН),
Ташкилот (корхона) номи, Ташкилот телефон рақами, Ой, Лавозими, Ставка, Маош, Таълим`.
Bo'lim, aniq sana va kvota yo'q — Qibray vakansiyalari sanasiz, "Eng yangi"
saralashda oxirida. Import buni o'zi aniqlaydi (`findHeaderRow`, `REQUIRED_FIELDS`).

## 6. Bulut sessiyasining cheklovlari

- **Tarmoq** ("Claude" muhiti): 2026-10-05 dan **to'liq ochiq** — jonli sayt, `.uz`
  saytlar (WHOIS: `cctld.uz/whois/?domain=…&zone=uz`), `dns.google` va boshqalar `curl`
  bilan ochiladi. Muhit qayta cheklansa — 3-bo'limdagi yo'l bilan domen qo'shiladi.
- **Production `/admin`** ga `$PROD_ADMIN_PASSWORD` bilan kirish — faqat foydalanuvchi
  aniq so'raganda yoki ruxsat berganda, faqat o'qish uchun. Auto rejimdagi xavfsizlik
  tekshiruvi so'ralmagan urinishni to'xtatadi ("Production Reads"); 2026-10-05 da
  foydalanuvchi "parol bilan kiraver" degach ishladi. Kirish formasi JavaScript'siz ham
  ishlaydi: `/admin` sahifasidagi yashirin `$ACTION_*` maydonlari + `password` ni multipart
  POST qilish → `admin_sessiya` cookie (8 soat); cookie faylini ishdan keyin o'chiring.
  Chromium (Playwright) bilan jonli sayt sinab ko'rilmagan (proksi sertifikati uchun
  `certutil` yo'q) — `curl` ishlaydi.
- **SessionStart hook** (`.claude/hooks/session-start.sh`): Postgres 16, lokal
  `vak`/`vakansiyalar` baza, `schema.sql`, `portal/.env.local` (lokal admin paroli
  `parol123`), `npm install`; lokal baza bo'sh bo'lsa `portal/data/seed/*.xlsx`
  (sun'iy namunalar: 120 shahar + 40 Qibray vakansiya) importi — har doim lokal bazaga.
- **Lokal sayt:** `cd portal && npm run dev`, yoki `npm run build && npx next start -p 3100`.
  Vizual tekshiruv: Playwright global o'rnatilgan, Chromium —
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Oldingi sessiyada 360/768/1440 px,
  yorug'/tungi mavzuda sahifalar skrinshot bilan tekshirilgan.
- **Push = production.** Pushdan oldin `portal/` ichida:
  `npm run typecheck && npm run lint && npm test && npm run build`.
- **Commit muallifi:** `git config user.name Claude` va
  `git config user.email noreply@anthropic.com` (aks holda GitHub "Unverified" deydi).
- **Repo ochiq** — repoga (shu fayl ham) hech qachon: parollar, tokenlar, `DATABASE_URL`,
  haqiqiy Excel fayllar. Parollar faqat Vercel'da va Claude muhit sozlamalarida
  (`PROD_ADMIN_PASSWORD`). Foydalanuvchi parolini so'rasa — chatda aytish mumkin,
  faylga yoki commitga yozilmaydi.
- Claude o'z ruxsat sozlamalarini (`.claude/settings.json` permissions) o'zgartira
  olmaydi — xavfsizlik tekshiruvi bloklaydi. Ruxsat rejimini foydalanuvchi sessiya
  oynasida o'zi tanlaydi.

## 7. Qilingan ishlar (xronologiya)

| Sana | Nima qilindi |
| --- | --- |
| 2026-08-24…26 | Foydalanuvchi `PLAN.md` va Excel faylni berdi. Portal `portal/` ga qurildi: import (15 174 qator), normalize/transliterate, xarita, statistika, admin, ochiq API |
| 2026-09-07 | Zamonaviy dizayn, tungi rejim, mobil navigatsiya, saqlanganlar, admin bo'limlari, Telegram bot kodi, barqaror id'lar (fingerprint) |
| 2026-09-28 | To'liq audit (105 topilma, 49 tasdiqlangan) va tuzatishlar: qidiruv, xavfsizlik, a11y, i18n, bildirishnoma, import; ESLint; SessionStart hook; Vercel tayyorgarligi (bazasiz build, `SetupNotice`) |
| 2026-10-01…02 | Eski repo foydalanuvchiniki emasligi aniqlandi → foydalanuvchi `Qibraysadosi/toshkent-vakansiyalar` yaratdi, kodni Git Bash + patch bilan push qildi. Vercel'ga Chrome kengaytmasi orqali ulandi, Supabase yaratildi, sxema qo'llandi, `DATABASE_URL` qo'shildi, Toshkent fayli admin orqali yuklandi |
| 2026-10-04 | **Qibray tumani** (commit `c0bf057`): sarlavha qatorini topish, ixtiyoriy ustunlar, hudud bo'yicha almashtirish, `-qibray` batch, korxona tumanini qayta hisoblash, xarita (punktir chegara)/filtr/sahifalar/bot. Qibray fayli yuklandi va tekshirildi |
| 2026-10-04 | Korxonani STIR bo'yicha boyitish manbalari o'rganildi (9-bo'lim) |
| 2026-10-04 | README tuzatish (`2653587`); shu HANDOFF, ildiz `CLAUDE.md`, sun'iy seed fayllar, hook xavfsizligi |
| 2026-10-05 | Yangi sessiya: "Claude" muhitiga jonli sayt domeni (Custom) va `PROD_ADMIN_PASSWORD` qo'shildi; sayt va `/admin` sessiyadan tekshirildi — raqamlar o'zgarmagan |
| 2026-10-05 | **Xatoga chidamli qidiruv** (`src/lib/fuzzy.ts`): к/қ, х/ҳ farqi, natija 10 dan kam bo'lsa 1–2 harf xatosi bo'yicha o'xshash lavozimlar, "Balki shuni qidirgandirsiz", autocomplete. Normalize/sxema o'zgarmadi. PLAN → "2026-10: xatoga chidamli qidiruv" |
| 2026-10-05 | Manzil **kasbegasi.vercel.app** (Vercel MCP orqali: domen, `NEXT_PUBLIC_SITE_URL`, production deploy `dpl_D4FEeCZpkEM3uGzyUvwJrtm9rCFp`). `kasbegasi.uz` faollashishini Routine har 3 soatda tekshiradi |

## 8. Chrome kengaytmasi uchun topshiriq namunasi (import)

Har safar fayl turi va kutilgan raqamlarni moslang. Parolni foydalanuvchiga chatda bering.

```text
Goal: import a vacancies Excel file into https://kasbegasi.vercel.app via its admin panel and verify the result. The UI is in Uzbek. Report briefly after each step. Never type passwords and never choose files yourself — ask the user for those.

1. Open https://kasbegasi.vercel.app/admin. If a password form is shown: click into the password field, STOP and ask the user to type the admin password and press "Kirish". Wait for the admin menu ("Umumiy", "Import", ...).
2. Click "Import" (/admin/import). Leave the "Batch nomi" field as it is. Click the file input — a native dialog opens: STOP and ask the user to select the Excel file. Wait until the file name is shown.
3. Click "Oldindan ko'rish" and wait up to 60 seconds. Report: the "Batch:" line, the "Almashtiriladi:" line, "Bazaga yoziladigan vakansiya", "Korxonalar", "O'tkazib yuborilgan", "Tumanlar", and whether a yellow box starting with "Diqqat" is shown. If there is a "Diqqat" box or a red error, report it exactly and STOP without confirming.
4. Click the button whose label starts with "Tasdiqlash —". Do NOT click "Bekor qilish". Wait up to 60 seconds for the message starting with "Import tugadi" and report it in full.
5. Open https://kasbegasi.vercel.app/ and report the total job positions counter, the number next to "tuman", and the numbers on the district map.

Rules: do not change any settings on Vercel or in the admin panel; do not hide vacancies; do not touch "Sinonimlar" or "Telegram"; do not open billing. If anything unexpected appears, stop and describe it instead of guessing.
```

## 9. Ochiq mavzu: korxona haqida ma'lumot (STIR bo'yicha boyitish)

**Holat:** foydalanuvchi hali qaror qilmagan. Infratuzilma tayyor: `companies`
jadvalida `official_name, address, activity_type, registered_date, status,
enriched_at`; `/korxona/[stir]` ularni ko'rsatadi; `scripts/enrich.ts`
(`npm run enrich`, `npm run enrich:probe`, 1 so'rov/sek, to'xtagan joyidan davom).
Undagi manba manzillari **taxminiy, tekshirilmagan** — haqiqiy manba adapteri kerak.
Telefonlar allaqachon Excel'dan keladi (vakansiya va korxona sahifalarida qo'ng'iroq
tugmasi). Yetishmayotgani asosan **manzil**.

| Manba | Nima beradi | Kirish | Xulosa |
| --- | --- | --- | --- |
| orginfo.uz | stat.uz ma'lumotining nusxasi | API yo'q; kuniga ~50 so'rovdan keyin bloklaydi. 2021-12 da Statistika qo'mitasi asoschisi ustidan IIVga shikoyat qilgan: ma'lumot kelishuvsiz yig'ilgan, eskirgani qo'mita nomidan ko'rsatilgan | **Ishlatilmaydi** (PLAN §8 ham taqiqlaydi) |
| registr.stat.uz (ЕГРПО) | 2020-yildan ochiq: kodlar, **pochta manzili, telefonlar, ta'sischilar**; modulda yana holat, OKED, ustav fondi, rahbar F.I.O. | saytda bepul, lekin har so'rovda captcha. Rasmiy olish — Statistika agentligiga so'rov (VM 539-son qaror, 28.09.2022) | Manzil uchun eng to'g'ri rasmiy manba |
| Soliq qo'mitasi — markaziy baza integratsiyasi | asosiy kodlar, soliq to'lovchi turi, toifa, ro'yxatdan o'tgan sana | rasmiy, **bepul**, ariza orqali; "o'z axborot tizimlarida foydalanish uchun" ruxsat | Bepul yo'l; manzil/telefon tasdiqlanmagan |
| data.egov.uz | ochiq datasetlar (JSON) | ro'yxatdan o'tib API kalit | Yuridik shaxslar reyestri bor-yo'qligi tekshirilmagan |
| iHamkor.uz (Venkon Group: Didox, 1C) | Soliq ma'lumotlari: ta'sischilar, moliya, soliqlar, tekshiruvlar, litsenziyalar, bog'liq korxonalar, iHamkor.Index | API bor (`api.i-hamkor.uz`, client ID + login/parol — uchinchi tomon paketidan); obuna | Eng tez yo'l, pullik |

- **Soliq kodeksi 29-modda:** soliq siriga kirmaydi — STIR, qonunbuzarliklar, soliq
  rejimi, to'langan soliqlar, ishtirokchilar, xodimlar soni, daromad/xarajat.
- **iHamkor tariflari** (sayt, yillik = 10 oy narxi): XS 10 so'rov — 250 000 so'm/oy;
  S 50 — 1,1 mln; M 150 — 3 mln; L 500 — 9 mln; XL 1 500 — 22,5 mln; Premium — kelishuv.
  API shu tariflarga kiradimi — noma'lum.
- **"iHamkor for Startups":** 6 oy bepul API (IT Park rezidenti, ≤10 xodim, yillik
  tushum ≤500 mln so'm).
- **Hisob-kitob:** ~1 160 korxona bir marta + har oy yangilari → 1-yil ≈ 33,5 mln so'm
  (XL 1 oy + S yillik). Har oy nechta yangi korxona chiqishi hali o'lchanmagan.
- **Berilgan tavsiya:** iHamkor'dan individual taklif so'rash (API kiradimi? 1 160 ta
  bir martalik narxi? ochiq saytda ko'rsatish huquqi?) yoki rasmiy yo'l (Statistika
  agentligi — manzil; Soliq — bepul integratsiya). Ma'lumot saytda chiqsa — manba va
  olingan sana yozilsin, har oy yangilansin. Skript uchun API domeni muhit tarmoq
  sozlamalarida ruxsat etilishi kerak.

**Tashqi vakansiya manbalari (hh.uz, OLX) — 2026-10-05 tahlil, qaror yo'q:**

| Manba | Holat | Xulosa |
| --- | --- | --- |
| hh.uz (HeadHunter) | 2026-aprel'dan ochiq API'da vakansiya qidiruvi faqat avtorizatsiya bilan; kalit asosan ish beruvchi/rekruting servislariga, moderatsiyadan keyin. Shartlar: ma'lumotni tijoratda ishlatish va uchinchi shaxslarga berish taqiqlangan | Faqat HeadHunter bilan to'g'ridan-to'g'ri shartnoma |
| OLX.uz | Partner API faqat o'z e'lonini joylash/boshqarish uchun; boshqalarnikini o'qish — parsing (shartlarga zid). E'lonlarda shaxsiy ism/telefon — "Shaxsga doir ma'lumotlar" qonuni 27¹-modda (O'zbekistondagi serverda saqlash; baza AQShda) | Tavsiya etilmaydi |
| ish.mehnat.uz (Milliy vakansiyalar bazasi, Bandlik vazirligi) | Davlat bazasi; data.egov.uz'da "mavjud vakansiyalar" dataseti bor (tarkibi tekshirilmagan — tarmoq bloklaydi) | Eng to'g'ri yo'l: vazirlikdan API/ruxsat so'rash |

Saytda kerak bo'ladigan o'zgarishlar (manba topilsa): manba belgisi + asl e'longa havola,
STIR'siz ish beruvchilar (hozir `vacancies.stir` majburiy), kunlik avtomatik yangilash,
manzil matnidan tuman, rasmiy statistika alohida qolsin. Muqobil: ish beruvchi o'zi
joylaydigan kabinet (PLAN → Keyinga).

## 10. Keyingi mumkin bo'lgan ishlar

- Korxona boyitish — 9-bo'limdagi qarorga bog'liq.
- **Telegram bot:** @BotFather'dan token → Vercel'da `TG_BOT_TOKEN` → Redeploy → kompyuterda
  `portal/.env.local` ga `TG_BOT_TOKEN`, `TG_WEBHOOK_SECRET` (Vercel'dagi bilan bir xil) va
  `NEXT_PUBLIC_SITE_URL` (Vercel'dagi bilan bir xil — hozir `https://kasbegasi.vercel.app`)
  yozib `npm run telegram:setup`. Saytdagi bot havolasi uchun `NEXT_PUBLIC_TG_BOT` (bot username).
- **O'z domeni:** `kasbegasi.uz` faollashishi kutilmoqda (3-bo'lim, Domen). O'tgandan keyin
  eski manzillarni `kasbegasi.uz` ga yo'naltirish (Vercel → Domains → Edit → Redirect 308).
- `ADMIN_PASSWORD` ni almashtirish (yangi qiymat ikki joyga: Vercel `ADMIN_PASSWORD` +
  Redeploy, Claude muhitidagi `PROD_ADMIN_PASSWORD`); "jhon's projects" dagi bo'sh Vercel
  loyihasini o'chirish.
- Supabase bepul loyiha 7 kun ishlatilmasa pauza bo'ladi — Dashboard → Restore.
- Lighthouse o'lchovi (sandbox'da o'lchanmagan); `xlsx@0.18.5` (CVE-2023-30533) → `exceljs`.
- Keyingi importda yangi korxonalar sonini o'lchash (iHamkor tarifini tanlash uchun).

## 11. Foydali buyruqlar (`portal/` ichida)

| Buyruq | Vazifasi |
| --- | --- |
| `npm run dev` | lokal sayt (http://localhost:3000) |
| `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` | pushdan oldingi tekshiruvlar |
| `npm run import:dry -- fayl.xlsx` | faylni bazaga yozmasdan hisobot |
| `npm run import -- fayl.xlsx --batch 2026-11` | import (`.env.local` dagi bazaga) |
| `npm run db:schema` | `schema.sql` ni qo'llash (idempotent) |
| `npm run enrich:probe` | boyitish manbalarini sinash |
| `npm run telegram:setup`, `npm run notify` | Telegram webhook va bildirishnomalar |

## 12. Suhbat jurnali

Foydalanuvchi xabarlari **so'zma-so'z** (imlosi o'zgartirilmagan), → dan keyin Claude
nima qilgani. Skrinshot va uzun hisobotlar [qavs ichida] tasvirlangan; parol va maxfiy
qiymatlar yozilmagan. Eski repo/shox nomlari o'sha paytdagi holat (hozirgisi — 3-bo'lim).

**2026-08-24…26 — qurilish**

1. [`PLAN.md` va 2026-07 oylik Excel fayli yuklandi] → PLAN bo'yicha poydevor: `portal/`
   da Next.js + Postgres, import (15 174 qator → 12 163 yozuv, 3 011 takror birlashdi),
   normalize/transliteratsiya ("qorovul" → 62 ish o'rni, avval 6 ta).
2. "hozircha Saytni lokalda to'liq tayyorla, qolgan ishni keyin qilamiz. Men qilishim
   kerak joylarni oxiriga qo'y. O'zing boricha yasab tur" → PLAN'ning 7 bosqichi lokalda
   tayyor: UI, xarita, qidiruv v2 + alifbo, admin, statistika, korxona sahifalari,
   SEO/PWA/API. Oxirida foydalanuvchi qiladigan ishlar ro'yxati.

**2026-09-07 — takomillashtirish**

3. "Saytni yanada takomillashtir. Kerak funksiyalar qo'sh. Oxiri men qilishim kerak
   bo'lgan ishgacha tayyor qil. Dizaynini ham zamonaviy qil. Har qanday qurilmada shu
   qurilma ekraniga mos bo'lib ochilsin. Admin panel ham qulay bo'lsin" → tungi rejim,
   telefonda pastki navigatsiya, 360–1440 px Playwright tekshiruvi, saqlanganlar, admin
   bo'limlari, Telegram bot kodi, barqaror id'lar. (Orada: "Try again" — uzilgan javob.)
4. "Men nima qilishim kerakligini sodda, bosqichma bosqich tushuntir" → kompyuterda
   ishga tushirish va joylash bo'yicha qadamma-qadam qo'llanma (keyin bulutga ko'chish
   bilan eskirdi).

**2026-09-28…29 — audit va bulut**

5. "Sayt tayyormi? Kodlari qayerda" → ha; kod o'shanda `Jhonjonsin2006/fintellect`,
   shox `claude/new-session-e6mypq`, papka `portal/`.
6. "Barcha xatolarini ko'rib chiq, frontendini ham to'g'irla. Cloud ga ko'chir. Kompyuter
   yo'q payt telefonda ham to'g'irlab ketaverishim uchun" (keyingi kuni qayta yuborilgan)
   → audit: 105 topilma, 49 tasdiqlangan; qidiruv, xavfsizlik, a11y, i18n, bildirishnoma,
   import tuzatildi; ESLint, SessionStart hook, bazasiz build. Push 403 → patch fayl berildi.
7. "Nimadir qilmoqchi bo'lsang allow mi yo deny deb sorama. hamma narsaga allow
   qiladigan nimadir qil" (ikki marta) → Claude o'z ruxsatlarini o'zgartira olmadi;
   `.claude/settings.json` ga `permissions` qo'shish yo'li ko'rsatildi (1-bo'lim).

**2026-10-01…02 — yangi repo, Vercel, Supabase**

8. "Ulanganmi, tekshir" → yo'q: Claude'ga ulangan GitHub hisobi Qibraysadosi, repo
   Jhonjonsin2006 niki → push 403.
9. "Shundaymi" [GitHub App sozlamalari skrinshoti] → App faqat Qibraysadosi hisobida.
10. "Jhonjonsin2006 yo'q menda. Hammasini 0 dan boshlab hozirgi akkauntga ula" → Claude
    repo yarata olmadi (403) → foydalanuvchi github.com/new da bo'sh repo yaratishi so'raldi.
11. "yaratdim" → sessiyadan boshqa hisob reposiga ko'chirish xavfsizlik tekshiruvida
    bloklandi → Git Bash + patch buyruqlari berildi.
12. "Terminalni qanday ochaman" → Git Bash'ni topish/o'rnatish, patch'ni yuklab olish.
13. "Kodni paste qilib bo'lmayapti" [Git Bash skrinshoti] → o'ng tugma → Paste yoki
    Shift+Insert, buyruqlar bittadan.
14. [5 ta Git Bash skrinshoti] → "unable to auto-detect email" → `git config --global
    user.name/user.email`; patch Downloads'da yo'q → qayta yuborildi; oxiri yangi repo
    `main` = `bdabbd0` push qilindi.
15. "O'zing browserimga ulanib qilib ber. Yoki browser och, o'zim login parol kiritib
    beraman" → bulut sessiyasi brauzerga ulana olmaydi, vercel.com bloklangan.
16. "Saytga kirdim. Toshkent vakansiyalar qayerda" [Vercel skrinshoti] → foydalanuvchi
    "qibraysadosi's projects" hisobida; "New repository detected" → `portal` ni import.
17. "To'xta, men shu oynada claude ni chrome kengaytmasini ochaman. Sen unga topshiriq
    yozib ber, men copy qilib unga tashlayman" → inglizcha kengaytma topshirig'i
    (Vercel import, Root `portal`). **Shu usul keyin asosiy bo'ldi** (8-bo'lim).
18. [Vercel env formasi skrinshoti] → `ADMIN_PASSWORD` va `TG_WEBHOOK_SECRET` qiymatlari
    chatda berildi (shuning uchun almashtirish tavsiyasi).
19. "Shnday yozdi: Deploy muvaffaqiyatli yakunlandi. …" [kengaytma hisoboti: Ready,
    https://toshkent-vakansiyalar-steel.vercel.app, `main · bdabbd0`] → Supabase yaratish,
    sxema, `DATABASE_URL`, Redeploy uchun kengaytma topshirig'i.
20. [kengaytma xabari: `DATABASE_URL` formasi tayyor, `[YOUR-PASSWORD]` o'rniga baza
    parolini qo'yish kerak] → parolni qo'yish va maxsus belgilarni kodlash tushuntirildi.
21. [skrinshot: kengaytma "barcha ishlar yakunlandi"] → baza ulandi; Excel importni
    foydalanuvchi qilishi kerak (fayl tanlash oynasi).
22. "Men tushunmadim. Chrome claude kengaytmasi uchun buyruq yozib ber, u hammasini
    qilsin" → to'liq import topshirig'i (parol va fayl tanlashda STOP).
23. [kengaytma hisoboti: 15 174 qator → 12 045 yozuv, 3 129 takror, 1 035 korxona,
    12 tuman, xato 0; "qorovul" — 58 natija] → sayt to'liq ishga tushdi, holat jadvali.

**2026-10-04 — Qibray, korxona ma'lumoti, handoff**

24. "Qibray tumani vakansiyalarini yuklasam uni ham qo'shib qo'ya olasanmi?" → ha, lekin
    avval kod: import "to'liq surat" edi — Qibray fayli Toshkentni o'chirib yuborardi.
    Faylni chatga yuklash so'raldi.
25. [Qibray Excel fayli yuklandi] → `c0bf057`: sarlavha qatorini topish, ixtiyoriy
    ustunlar, hudud bo'yicha almashtirish, `-qibray` batch, xarita/filtr/sahifalar; 74 test.
26. "Shu yerning o'zida browser ocha olmaysanmi?" → headless Chromium bor, lekin tarmoq
    siyosati saytni bloklaydi; muhitga domen qo'shish yo'li ko'rsatildi (6-bo'lim).
27. "Men chiqib ketgandim saytdan. 0 dan topshiriq ber, saytga kirishdan tortib,
    oxirigacha" → deploy tekshiruvi → login → import → tekshiruv; to'liq kengaytma topshirig'i.
28. [skrinshot: Qibray — 880 ta natija] → tasdiqlandi, Toshkent o'zgarmagan (yuqoridagi
    namuna javob).
29. "Ish beruvchini stiri orqali u haqida ma'lumotni qanday topadigan qilsak bo'ladi?
    orginfo.uz mi, registr.stat.uz mi yo shu kabilardan api olib, ulasak bo'ladimi" →
    manbalar tahlili (9-bo'lim). Faqat tahlil, kod o'zgarmadi.
30. "registr.stat.uz dan api ni qanday olishgan" → orginfo API olmagan: 2021 da ochiq
    sahifalarni avtomatik yig'gan, kelishuvsiz; 2021-12 da Statistika qo'mitasi shikoyati.
31. "Ihamkor.uz dan ma'lumot tortib keladigan qilsa bo'ladimi" → ha, rasmiy API bor.
32. "Pul to'lasam qanchaga tushaman" → tariflar jadvali, 1-yil ≈ 33,5 mln so'm.
33. "Rasmiy integratsiya orqali ham manzili, telefon raqamlarini ko'ra olamizmi?" →
    manzil/telefon — Statistika agentligi (ЕГРПО) orqali; Soliq integratsiyasida
    tasdiqlanmagan.
34. "Bu eslatma eski Jhonjonsin2006/fintellect reposi uchun, u yerga yozish huquqi yo'q
    (403). O'sha commitlar Qibraysadosi/toshkent-vakansiyalar da bor. Oxirgi javob faqat
    tahlil edi, yangi kod o'zgarishi bo'lmadi deganing nimasi? Nima qilsam shu muammo
    bo'lmaydi" → bu avtomatik tekshiruvchi eslatmasi: sessiya eski repo bilan ochilgan,
    eski papkada push qilinmagan 5 commit bor (mazmuni yangi repoda to'liq). Yechim —
    yangi sessiyani `Qibraysadosi/toshkent-vakansiyalar` bilan ochish.
35. "Shu sessiyaning o'zida Repository ni o'zgartirib bo'lmaydimi" → asosiy repo sessiya
    ochilganda belgilanadi; eski papkani tozalash taklif qilindi — javob bo'lmadi, yangi
    sessiyada ahamiyatsiz.
36. "Yangi sessiya uchun bu sessiyada bo'lgan hamma suhbatni ko'chirib, 1 ta pdf mi, md
    mi yo shu kabi fayl tayyorlab ber. Uni claude code ga yuklaganimda bittada hammasini
    tushunib olsin va keyin hozir sen bilan gaplashganimizdek gaplashib ketaversin.
    Xullas qisqasi o'zingni yangi sessiyaga klonlahing kerak" → shu `HANDOFF.md` va ildiz
    `CLAUDE.md` (har sessiyada avtomatik yuklanadi), sun'iy seed fayllar, hook xavfsizligi.
37. "Parollarni ham kiritib ber" → repo ochiq (public) ekani aniqlandi, shuning uchun
    parollar bu faylga yozilmadi. Yopiq qilish ham mumkin emas (Vercel Hobby Claude
    commitlarini bloklaydi). O'rniga: Claude muhit sozlamalariga `PROD_ADMIN_PASSWORD`
    qo'shish. Baza parolini Claude bilmaydi (foydalanuvchida), sessiyaga kerak ham emas.

**2026-10-05 — yangi sessiya: muhit sozlamalari**

38. "Holatni qisqacha ayt" → holat jadvali (sayt, ma'lumot, kod) va ochiq masalalar.
39. [`HANDOFF.md` fayli chatga yuklandi] → repodagi eski nusxa ekan; GitHub'dagi yangisi
    (37-band) tortib olindi. Faylni yuklash shart emas — sessiya ochilganda o'qiladi.
    Sayt bloklangan, `PROD_ADMIN_PASSWORD` yo'q — muhit sozlamasiga qo'shish so'raldi.
40. "PROD_ADMIN_PASSWORD=[parol — bu yerga yozilmadi]" → parol chatga yozildi; faylga
    yozilmadi, to'g'ri joyi muhit sozlamasi ekani tushuntirildi, almashtirish tavsiya qilindi.
41. "jonli sayt tarmoq sozlamasidagi blokni qanday olib tashlasam bo'ladi" → Network
    access → Custom → domen qo'shish qadamlari.
42. [Desktop ilova skrinshoti] "Qayerni bosay" → sozlama sessiya sarlavhasida emas:
    repo yonidagi **+** → muhit tanlagichi → Cloud → **Claude** ⚙ (3-bo'lim).
43. "Endi tekshirchi" → hali bloklangan edi: o'zgarish "Default" muhitiga saqlangan
    (sessiya "Claude" da) → "Claude" muhitida takrorlash so'raldi.
44. "tekshir" → sayt ochildi, parol bor, raqamlar mos (4-bo'lim). Admin'ga kirish
    urinishini xavfsizlik tekshiruvi to'xtatdi → foydalanuvchidan ruxsat so'raldi.
45. "/admin parol bilan kiraver. Chunki saytni o'zing yaratgansan. Men hali hech nima
    qo'shmadim" → admin panelga kirildi (faqat o'qish): 16 216 / 12 925 / 1 162, oxirgi
    importlar `2026-10-qibray` (880, 04.10.2026) va `2026-10` (12 045, 02.10.2026).
46. "qo'sh" → HANDOFF `main` ga qo'shildi (`d89c1cf`), Vercel qayta joyladi, raqamlar o'zgarmagan.
47. "Saytda vakansiya nomini xato yozsa ham o'zi bilib bilib qidiradigan funksiya bormi" →
    bor, lekin chala: jonli API'da farosh 1 (farrosh 521), xamshira 133 (hamshira 718),
    коровул 3 (qorovul 75). Ikki yo'l taklif qilindi: sinonimlar (kodsiz) yoki kod.
48. "Kod bilan" → `src/lib/fuzzy.ts` + queries.ts (PLAN → "2026-10: xatoga chidamli
    qidiruv"). Birinchi urinish (pg_trgm `word_similarity` + SQL `regexp_replace`)
    sekin (150+ ms) va "qarovul" ni topmadi → xato sanash JS'da, SQL'da faqat
    `translate`. 93 test; lokal 13 ming sun'iy qatorda tekshirildi. Production'ga
    qo'yish uchun "qo'sh" kutilmoqda.
49. "Bu vakansiyalar bazasiga hh.uz , olx.uz kabilardagi vakansiyalarni ham ulay olamizmi?"
    → tahlil (9-bo'lim oxiri, "Tashqi vakansiya manbalari"). Faqat tahlil, kod o'zgarmadi.
50. "HH.uz va olx.uz ga xat bilan chiqib ko'rsak nima deysan" → arziydi, lekin umid kam;
    tartib: vazirlik → hh.uz → OLX. Xat uchun so'raldi: kim nomidan, aloqa, sayt tijoratmi.
51. "toshkent-vakansiyalar-steel.vercel.app ni kasbegasi.vercel.app qilib o'zgartir" →
    Chrome kengaytmasi topshirig'i berildi (keyin keraksiz bo'ldi, 52-band).
52. "Vercel sozlamalaringni shunga o'zgartirish uchun nima qilish kerak" → hech narsa:
    konnektor allaqachon qibraysadosi hisobida. Topildi: foydalanuvchi `kasbegasi.uz` ni
    Vercel'ga qo'shgan, lekin DNS NXDOMAIN. Claude o'zi: `kasbegasi.vercel.app` domeni,
    `NEXT_PUBLIC_SITE_URL`, production deploy — tekshirildi (16 216, sitemap/canonical yangi).
53. ".uz saytlar ham, boshqalari ham bloklanmagan. To'liq ochildi" → muhit tarmog'i to'liq
    ochildi; WHOIS: `kasbegasi.uz` — "Активацияни кутиш", NS Vercel, 05.10.2026.
54. "Domen holatini har 3 soatda tekshir. Agar ishga tushgan bo'lsa saytni kasbegasi.uz ga
    o'tkaz" → Routine `trig_01TgaZwXSHCgn5GxidaEZP8p` (3-bo'lim, Domen).
