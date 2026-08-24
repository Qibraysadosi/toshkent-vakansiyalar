-- Toshkent vakansiyalar portali — baza sxemasi (PLAN.md §4)
--
-- Qo'llash: Supabase Dashboard → SQL Editor → shu faylni to'liq nusxalab "Run".
-- Skript idempotent: qayta ishga tushirsa ham xato bermaydi, ma'lumot o'chmaydi.

-- pg_trgm — qidiruvning poydevori. GIN indeksdan OLDIN yaratilishi shart.
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- companies — 1 035 ta unikal STIR. Har oylik importda upsert qilinadi,
-- 6-bosqichda tashqi manbalardan boyitiladi (boyitilgan maydonlar o'chmaydi).
-- ---------------------------------------------------------------------------
create table if not exists companies (
  stir            text primary key,           -- 9 xonali, string (boshidagi 0 saqlanadi)
  name            text not null,
  name_search     text not null,              -- normalize(name) — PLAN §3.1
  phone           text,                       -- vergul bilan ajratilgan bir nechta raqam bo'lishi mumkin
  district        text,                       -- eng ko'p uchragan tuman (4 ta STIR bir nechta tumanda ishlaydi)

  -- 6-bosqich: tashqi manbalardan boyitish
  official_name   text,
  address         text,
  activity_type   text,
  registered_date date,
  status          text,
  enriched_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- vacancies — har oy to'liq almashtiriladi (yangi batch + eski batch o'chadi).
-- ---------------------------------------------------------------------------
create table if not exists vacancies (
  id              bigserial primary key,
  stir            text not null references companies (stir),
  district        text not null,              -- vakansiyaning O'Z tumani (companies.district emas)
  department      text,
  position        text not null,              -- original yozuvda (kirill yoki lotin)
  position_search text not null,              -- normalize(position) — qidiruv shu ustundan boradi
  posted_date     date,
  stavka          numeric(4, 2),
  salary          numeric,                    -- NULL bo'lsa salary_note to'ldiriladi
  salary_note     text,                       -- 'Shtat jadvali bo''yicha' | 'Aniqlashtirilmoqda'
  education       text,
  quota           text,
  positions_count int not null default 1,     -- bir xil qatorlar birlashtirilgan soni
  views           int not null default 0,
  import_batch    text not null
);

-- ---------------------------------------------------------------------------
-- Qidiruvni kuchaytirish va analitika (4-bosqich)
-- ---------------------------------------------------------------------------
create table if not exists synonyms (
  term      text primary key,                 -- normalize'langan so'rov, masalan 'storoj'
  canonical text not null                     -- normalize'langan mos so'z, masalan 'qorovul'
);

create table if not exists search_logs (
  id            bigserial primary key,
  query_norm    text,
  results_count int,
  created_at    timestamptz not null default now()
);

-- Telegram obunalari (7-bosqich)
create table if not exists subscriptions (
  id         bigserial primary key,
  tg_chat_id bigint,
  query_norm text,
  district   text,
  created_at timestamptz not null default now()
);

-- Import tarixi (5-bosqichdagi admin panel shu jadvalni ko'rsatadi)
create table if not exists import_history (
  batch       text primary key,
  rows_read   int,
  rows_merged int,
  errors      jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indekslar
-- ---------------------------------------------------------------------------
create index if not exists idx_vac_pos_trgm   on vacancies using gin (position_search gin_trgm_ops);
create index if not exists idx_vac_district   on vacancies (district);
create index if not exists idx_vac_stir       on vacancies (stir);
create index if not exists idx_vac_salary     on vacancies (salary);
-- Importda eski batchni o'chirish uchun (PLAN §7 — to'liq almashtirish)
create index if not exists idx_vac_batch      on vacancies (import_batch);
-- Standart saralash: "eng yangi"
create index if not exists idx_vac_posted     on vacancies (posted_date desc);
-- Korxona nomi bo'yicha qidiruv
create index if not exists idx_comp_name_trgm on companies using gin (name_search gin_trgm_ops);
create index if not exists idx_logs_created   on search_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — Supabase jadvallarni anon kalit bilan PostgREST orqali ochib qo'yadi.
-- Shuning uchun RLS yoqiladi va faqat ochiq ma'lumotga o'qish ruxsati beriladi.
-- Yozish faqat service_role orqali (u RLS'ni chetlab o'tadi): import, admin, bot.
-- ---------------------------------------------------------------------------
alter table companies      enable row level security;
alter table vacancies      enable row level security;
alter table synonyms       enable row level security;
alter table search_logs    enable row level security;
alter table subscriptions  enable row level security;
alter table import_history enable row level security;

drop policy if exists "public read companies" on companies;
create policy "public read companies" on companies for select to anon, authenticated using (true);

drop policy if exists "public read vacancies" on vacancies;
create policy "public read vacancies" on vacancies for select to anon, authenticated using (true);

drop policy if exists "public read synonyms" on synonyms;
create policy "public read synonyms" on synonyms for select to anon, authenticated using (true);

-- search_logs / subscriptions / import_history uchun ochiq siyosat YO'Q:
-- ularga faqat server tomondagi service_role tegadi.

-- ---------------------------------------------------------------------------
-- Sinonimlar — boshlang'ich to'plam (PLAN §3.2).
-- Kalitlar normalize() natijasi bo'lishi SHART, aks holda qidiruvda topilmaydi.
-- ---------------------------------------------------------------------------
insert into synonyms (term, canonical) values
  ('storoj',      'qorovul'),
  ('oxrannik',    'qorovul'),
  ('dvornik',     'farrosh'),
  ('uborshitsa',  'farrosh'),
  ('uborshik',    'farrosh'),
  ('voditel',     'haydovchi'),
  ('povar',       'oshpaz'),
  ('medsestra',   'hamshira'),
  ('gruzchik',    'yuk ortuvchi'),
  ('uchitel',     'oqituvchi'),
  ('vospitatel',  'tarbiyachi'),
  ('buxgalter',   'hisobchi'),
  ('sekretar',    'kotib'),
  ('yurist',      'huquqshunos'),
  ('slesar',      'chilangar'),
  ('elektrik',    'elektromontyor'),
  ('prodavets',   'sotuvchi'),
  ('kassir',      'kassir'),
  ('injener',     'muhandis'),
  ('vrach',       'shifokor')
on conflict (term) do update set canonical = excluded.canonical;
