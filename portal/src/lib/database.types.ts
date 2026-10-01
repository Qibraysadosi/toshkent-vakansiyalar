/**
 * Jadval qatorlari turlari — `supabase/schema.sql` bilan qo'lda mos yuritiladi
 * (xom jadval qatori, ustunlar sxemadagi tartibda). Sxema o'zgarsa, shu fayl
 * ham yangilanadi.
 *
 * `queries.ts` dagi natija turlari (masalan, `SearchLogRow` — agregat,
 * `Subscription` — `tg_chat_id` bo'sh bo'lmagan ko'rinish) bu yerdagi xom
 * qatorlardan farq qiladi; nom to'qnashmasligi uchun xom jadval turlari
 * `...TableRow` deb ataladi.
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
  is_hidden: boolean;
  fingerprint: string;
  // `first_batch text` ustuni ham bor (faqat INSERT'da yoziladi) — import
  // kiritish turi `import-run.ts` da ixtiyoriy qilib qo'shiladi.
}

export type SynonymRow = {
  term: string;
  canonical: string;
}

/** Xom `search_logs` qatori (`queries.ts` dagi `SearchLogRow` — agregat, boshqa shakl). */
export type SearchLogTableRow = {
  id: number;
  query_norm: string | null;
  results_count: number | null;
  created_at: string;
  /** Foydalanuvchi yozgan asl so'rov */
  query: string | null;
}

export type SubscriptionRow = {
  id: number;
  tg_chat_id: number | null;
  query_norm: string | null;
  district: string | null;
  created_at: string;
  username: string | null;
  is_active: boolean;
  notified_at: string | null;
  /** Oxirgi ko'rib chiqilgan import batch */
  last_batch: string | null;
  /** Foydalanuvchi yozgan asl kasb matni */
  query_text: string | null;
}

/** Xom `import_history` qatori (`queries.ts` dagi `ImportHistoryEntry` bilan bir xil shakl). */
export type ImportHistoryTableRow = {
  batch: string;
  rows_read: number | null;
  rows_merged: number | null;
  errors: unknown;
  created_at: string;
}

/** Admin importining ikki bosqichli oraliq jadvali. */
export type ImportStagingRow = {
  token: string;
  batch: string;
  /** { companies: CompanyRow[]; vacancies: [...] } */
  payload: unknown;
  report: unknown;
  created_at: string;
}
