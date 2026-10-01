# data/seed — namuna ma'lumot (ixtiyoriy)

Bu papkaga qo'yilgan `*.xlsx` fayllar bulutli Claude Code sessiyasi boshlanganda
(`.claude/hooks/session-start.sh`) baza bo'sh bo'lsa avtomatik import qilinadi.
Shunda har yangi sessiyada sayt to'liq ma'lumot bilan ochiladi.

- Fayl formati — rasmiy oylik vakansiyalar Excel'i (`EXCEL_HEADERS` ustunlari).
- Repo ochiq bo'lsa, fayl ichida shaxsiy telefon raqamlari borligini hisobga oling.
- Production bazasiga bu fayl tegmaydi — u faqat sessiya ichidagi lokal Postgres uchun.
