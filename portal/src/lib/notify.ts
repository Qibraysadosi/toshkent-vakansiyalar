import { GrammyError } from 'grammy';
import { siteUrl } from './env';
import { districtByDbName } from './districts';
import { botConfigured, esc, formatVacancyMessage, sendHtml, subscriptionLabel } from './telegram';
import {
  deactivateSubscription,
  getLatestBatch,
  listPendingSubscriptions,
  markChecked,
  markNotified,
  matchesForSubscription,
} from './queries';

export interface NotifyResult {
  sent: number;
  skipped: number;
  failed: number;
  /** Vaqt chegarasi tufayli ko'rib chiqilmay qolganlar — qayta chaqirilsa davom etadi */
  remaining: number;
}

export interface NotifyOptions {
  /** Millisekund; 0 — cheksiz (skript). Standart 45 s — admin sahifasining maxDuration=60 ichida. */
  timeBudgetMs?: number;
}

const DEFAULT_BUDGET_MS = 45_000;
/** Yuborishlar orasidagi pauza — Telegram ~30 xabar/sek ruxsat beradi, biz 10 ta. */
const SEND_GAP_MS = 100;

/**
 * Importdan keyin obunachilarga mos yangi vakansiyalar (PLAN §9).
 * Admin paneldagi tugma va `scripts/notify.ts` bir xil funksiyani chaqiradi.
 *
 * Idempotent va davom etuvchi: har obunachi ko'rib chiqilgach `last_batch`
 * yoziladi (xabar ketdi, mos vakansiya yo'q yoki yuborib bo'lmadi) — Vercel
 * funksiyani o'ldirsa yoki tugma qayta bosilsa, qolganlaridan davom etadi va
 * hech kimga ikki marta bormaydi. Vaqt chegarasi tugasa `remaining` qaytadi.
 * Botni bloklagan foydalanuvchi (403) obunadan chiqariladi.
 */
export async function sendNotifications(batch?: string, opts: NotifyOptions = {}): Promise<NotifyResult> {
  if (!botConfigured()) throw new Error("TG_BOT_TOKEN o'rnatilmagan.");
  const target = batch ?? (await getLatestBatch());
  if (!target) throw new Error("Hali import qilinmagan — yuboriladigan batch yo'q.");

  const budget = opts.timeBudgetMs ?? DEFAULT_BUDGET_MS;
  const started = Date.now();
  const subs = await listPendingSubscriptions(target);
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let done = 0;

  for (const sub of subs) {
    if (budget > 0 && Date.now() - started >= budget) break;
    done++;

    const rows = await matchesForSubscription(sub, target, 5);
    if (rows.length === 0) {
      skipped++;
      await markChecked(sub.tg_chat_id, target);
      continue;
    }

    const district = sub.district ? districtByDbName(sub.district) : null;
    const kasb = subscriptionLabel(sub);
    const link =
      `${siteUrl()}/vakansiyalar?` +
      [sub.query_norm ? `q=${encodeURIComponent(sub.query_norm)}` : '', district ? `tuman=${district.slug}` : '']
        .filter(Boolean)
        .join('&');

    // Foydalanuvchi matni HTML parse_mode'ga faqat esc() orqali kiradi —
    // aks holda `<` yoki `&` bo'lsa Telegram 400 "can't parse entities" beradi.
    const head =
      `Yangi vakansiyalar${kasb ? ` — <b>${esc(kasb)}</b>` : ''}` +
      `${district ? ` (${esc(district.lat)})` : ''}:\n\n`;
    const html = head + rows.map(formatVacancyMessage).join('\n\n') + `\n\n<a href="${link}">Barchasi saytda →</a>`;

    try {
      await sendHtml(sub.tg_chat_id, html);
      await markNotified(sub.tg_chat_id, target);
      sent++;
      // Pauza faqat haqiqiy yuborishdan keyin — o'tkazib yuborilganlar kutmaydi
      await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    } catch (err) {
      failed++;
      // 403 — foydalanuvchi botni bloklagan: obunani to'xtatamiz
      if (err instanceof GrammyError && err.error_code === 403) {
        await deactivateSubscription(sub.tg_chat_id).catch(() => {});
      } else {
        console.error(`bildirishnoma xatosi (${sub.tg_chat_id}):`, err instanceof Error ? err.message : err);
        // Shu batch uchun qayta urinilmaydi — aks holda doimiy xato navbatni to'sib qo'yadi
        await markChecked(sub.tg_chat_id, target).catch(() => {});
      }
    }
  }

  return { sent, skipped, failed, remaining: subs.length - done };
}
