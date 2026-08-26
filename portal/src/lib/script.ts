import 'server-only';
import { cookies } from 'next/headers';
import { transliterate, type Script } from './transliterate';

export const SCRIPT_COOKIE = 'alifbo';

/**
 * Tanlangan alifbo cookie'da saqlanadi — shunda server tomonda ham to'g'ri
 * yozuvda render qilinadi (sahifa "sakramaydi" va SEO uchun ham yaxshi).
 */
export async function getScript(): Promise<Script> {
  const store = await cookies();
  return store.get(SCRIPT_COOKIE)?.value === 'cyr' ? 'cyr' : 'lat';
}

/** Server komponentlarda matnni tanlangan alifboga o'girish. */
export function tr(text: string | null | undefined, script: Script): string {
  return transliterate(text, script);
}
