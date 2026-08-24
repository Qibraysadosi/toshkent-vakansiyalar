/**
 * Muhit o'zgaruvchilari. Server-only kalitlar client bundle'ga tushib
 * qolmasligi uchun alohida funksiyalarga ajratilgan — `serverEnv()` faqat
 * server komponent / route handler / skriptdan chaqiriladi.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} o'rnatilmagan. .env.example dan nusxa olib .env.local yarating ` +
        `(Supabase → Settings → API).`,
    );
  }
  return value;
}

/** Brauzerda ham ochiq bo'ladigan qiymatlar (RLS bilan himoyalangan). */
export function publicEnv() {
  return {
    supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

/** FAQAT server. service_role RLS'ni chetlab o'tadi — brauzerga chiqmasin. */
export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() brauzerda chaqirilmaydi — SUPABASE_SERVICE_KEY sir.');
  }
  return {
    supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceKey: required('SUPABASE_SERVICE_KEY', process.env.SUPABASE_SERVICE_KEY),
  };
}
