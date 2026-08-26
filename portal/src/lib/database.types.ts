/**
 * Jadval qatorlari turlari — `supabase/schema.sql` bilan qo'lda mos yuritiladi.
 * Sxema o'zgarsa, shu fayl ham yangilanadi.
 *
 * Eslatma: qiymatlar `pg` drayveridan kelganda `numeric` ustunlar STRING
 * bo'lib keladi (aniqlik yo'qolmasligi uchun) — `queries.ts` da Number() bilan
 * o'giriladi.
 */

export type CompanyRow = {
  stir: string;
  name: string;
  name_search: string;
  phone: string | null;
  district: string | null;
  official_name: string | null;
  address: string | null;
  activity_type: string | null;
  registered_date: string | null;
  status: string | null;
  enriched_at: string | null;
}

export type VacancyRow = {
  id: number;
  stir: string;
  district: string;
  department: string | null;
  position: string;
  position_search: string;
  posted_date: string | null;
  stavka: number | null;
  salary: number | null;
  salary_note: string | null;
  education: string | null;
  quota: string | null;
  positions_count: number;
  views: number;
  import_batch: string;
}

export type SynonymRow = {
  term: string;
  canonical: string;
}

export type SearchLogRow = {
  id: number;
  query_norm: string | null;
  results_count: number | null;
  created_at: string;
}

export type SubscriptionRow = {
  id: number;
  tg_chat_id: number | null;
  query_norm: string | null;
  district: string | null;
  created_at: string;
}

export type ImportHistoryRow = {
  batch: string;
  rows_read: number | null;
  rows_merged: number | null;
  errors: unknown;
  created_at: string;
}
