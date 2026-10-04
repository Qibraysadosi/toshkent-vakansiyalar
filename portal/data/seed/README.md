# data/seed — sun'iy namuna ma'lumot

Bu papkadagi `*.xlsx` fayllar bulutli Claude Code sessiyasi boshlanganda
(`.claude/hooks/session-start.sh`) **lokal** baza bo'sh bo'lsa avtomatik import
qilinadi — sessiya ichida `npm run dev` sayti bo'sh ko'rinmasin, UI'ni tekshirish
mumkin bo'lsin.

| Fayl | Format | Qatorlar |
| --- | --- | --- |
| `namuna-1-shahar.xlsx` | Toshkent shahri (11 ustun, PLAN §1) | 120 |
| `namuna-2-qibray.xlsx` | Qibray tumani (nom qatori, sarlavha 2-qatorda, sana/bo'lim/kvota yo'q) | 40 |

- **Ma'lumot SUN'IY:** korxona nomlari `NAMUNA ...`, STIR `9000xxxxx` (shahar) va `9001xxxxx` (Qibray), telefonlar
  `998 00 00x xx xx` — mavjud emas. Haqiqiy Excel fayllar repoga qo'yilmaydi
  (`data/*.xlsx` gitignore'da).
- **Production'ga tegmaydi:** hook importni har doim `DATABASE_URL=<lokal>` bilan
  ishga tushiradi, muhitda Supabase secret bo'lsa ham.
- Qayta yaratish: fayllar `xlsx` kutubxonasi bilan yasalgan; yangi format kerak
  bo'lsa shu ikkalasidan nusxa olib o'zgartiring.
