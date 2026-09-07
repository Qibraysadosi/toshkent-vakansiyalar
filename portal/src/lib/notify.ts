import { GrammyError } from 'grammy';
import { siteUrl } from './env';
import { districtByDbName } from './districts';
import { botConfigured, formatVacancyMessage, sendHtml } from './telegram';
import {
  deactivateSubscription,
  getLatestBatch,
  listSubscriptions,
  markNotified,
  matchesForSubscription,
} from './queries';

/**
 * Importdan keyin obunachilarga mos yangi vakansiyalar (PLAN §9).
 * Admin paneldagi tugma va `scripts/notify.ts` bir xil funksiyani chaqiradi.
 *
 * Telegram limiti ~30 xabar/sek; biz sekundiga 5 ta bilan yuboramiz —
 * xavfsiz zaxira bilan. Botni bloklagan foydalanuvchi obunadan chiqariladi.
 */
export async function sendNotifications(batch?: string): Promise<{ sent: number; skipped: number; failed: number }> {
  if (!botConfigured()) throw new Error("TG_BOT_TOKEN o'rnatilmagan.");
  const target = batch ?? (await getLatestBatch());
  if (!target) throw new Error("Hali import qilinmagan — yuboriladigan batch yo'q.");

  const subs = (await listSubscriptions(5000)).filter((s) => s.is_active && (s.query_norm || s.district));
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const sub of subs) {
    const rows = await matchesForSubscription(sub, target, 5);
    if (rows.length === 0) {
      skipped++;
      continue;
    }

    const district = sub.district ? districtByDbName(sub.district) : null;
    const link =
      `${siteUrl()}/vakansiyalar?` +
      [sub.query_norm ? `q=${encodeURIComponent(sub.query_norm)}` : '', district ? `tuman=${district.slug}` : '']
        .filter(Boolean)
        .join('&');

    const head =
      `Yangi vakansiyalar${sub.query_norm ? ` — <b>${sub.query_norm}</b>` : ''}` +
      `${district ? ` (${district.lat})` : ''}:\n\n`;
    const html = head + rows.map(formatVacancyMessage).join('\n\n') + `\n\n<a href="${link}">Barchasi saytda →</a>`;

    try {
      await sendHtml(sub.tg_chat_id, html);
      await markNotified(sub.tg_chat_id);
      sent++;
    } catch (err) {
      failed++;
      // 403 — foydalanuvchi botni bloklagan: obunani to'xtatamiz
      if (err instanceof GrammyError && err.error_code === 403) {
        await deactivateSubscription(sub.tg_chat_id).catch(() => {});
      } else {
        console.error(`bildirishnoma xatosi (${sub.tg_chat_id}):`, err instanceof Error ? err.message : err);
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return { sent, skipped, failed };
}
