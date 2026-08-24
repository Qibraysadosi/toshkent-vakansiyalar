/**
 * Baza turlari — supabase/schema.sql bilan qo'lda mos yuritiladi.
 * Sxema o'zgarsa, shu fayl ham yangilanadi.
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

/** Insert paytida server tomonidan to'ldiriladigan maydonlar tashlab ketiladi. */
type Insert<T, OptionalKeys extends keyof T> = Omit<T, OptionalKeys> & Partial<Pick<T, OptionalKeys>>;

/** vacancies.stir -> companies.stir tashqi kaliti. */
type VacancyRelationships = [
  {
    foreignKeyName: 'vacancies_stir_fkey';
    columns: ['stir'];
    isOneToOne: false;
    referencedRelation: 'companies';
    referencedColumns: ['stir'];
  },
];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: CompanyRow;
        Insert: Insert<CompanyRow, 'phone' | 'district' | 'official_name' | 'address' | 'activity_type' | 'registered_date' | 'status' | 'enriched_at'>;
        Update: Partial<CompanyRow>;
        Relationships: [];
      };
      vacancies: {
        Row: VacancyRow;
        Insert: Insert<VacancyRow, 'id' | 'positions_count' | 'views' | 'department' | 'posted_date' | 'stavka' | 'salary' | 'salary_note' | 'education' | 'quota'>;
        Update: Partial<VacancyRow>;
        Relationships: VacancyRelationships;
      };
      synonyms: {
        Row: SynonymRow;
        Insert: SynonymRow;
        Update: Partial<SynonymRow>;
        Relationships: [];
      };
      search_logs: {
        Row: SearchLogRow;
        Insert: Insert<SearchLogRow, 'id' | 'created_at'>;
        Update: Partial<SearchLogRow>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: Insert<SubscriptionRow, 'id' | 'created_at'>;
        Update: Partial<SubscriptionRow>;
        Relationships: [];
      };
      import_history: {
        Row: ImportHistoryRow;
        Insert: Insert<ImportHistoryRow, 'created_at'>;
        Update: Partial<ImportHistoryRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
