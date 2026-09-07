import { Bot, InlineKeyboard, type Context } from 'grammy';
import { DISTRICTS, districtByDbName, districtBySlug } from './districts';
import { normalize } from './normalize';
import { formatSalary } from './format';
import { transliterate } from './transliterate';
import { siteUrl } from './env';
import {
  botSearch,
  deactivateSubscription,
  getSubscription,
  upsertSubscription,
  type VacancyListItem,
} from './queries';

/**
 * Telegram bot (PLAN §9) — grammY, webhook rejimi (`/api/telegram`).
 *
 * Oqim: /start → kasb so'zini yozadi → tuman tanlaydi (inline tugmalar) →
 * obuna saqlanadi. Har oylik importdan keyin `sendNotifications()` mos
 * yangi vakansiyalarni yuboradi. Oddiy matn yuborilsa — qidiruv
 * (sayt bilan BITTA normalize() + sinonim mantiqi, `botSearch`).
 *
 * Holat DB'da: `subscriptions.query_norm` bo'sh → kasb kutilmoqda.
 */

export function botConfigured(): boolean {
  return Boolean(process.env.TG_BOT_TOKEN);
}

function token(): string {
  const t = process.env.TG_BOT_TOKEN;
  if (!t) throw new Error("TG_BOT_TOKEN o'rnatilmagan.");
  return t;
}

declare global {
  // eslint-disable-next-line no-var
  var __vakansiyaBot: Bot | undefined;
}

const nf = new Intl.NumberFormat('ru-RU');
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] ?? c);

/** Bitta vakansiya — HTML formatida qisqa karta. */
export function formatVacancyMessage(v: VacancyListItem): string {
  const salary = formatSalary(v.salary === null ? null : Number(v.salary), v.salary_note);
  const district = districtByDbName(v.district)?.lat ?? v.district;
  const places = v.positions_count > 1 ? ` · ${v.positions_count} ta o'rin` : '';
  return (
    `<b>${esc(transliterate(v.position, 'lat'))}</b>\n` +
    `${esc(transliterate(v.company_name, 'lat'))}\n` +
    `${esc(salary.text)} · ${esc(district)}${places}\n` +
    `<a href="${siteUrl()}/vakansiya/${v.id}">Batafsil →</a>`
  );
}

function districtKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  DISTRICTS.forEach((d, i) => {
    kb.text(d.lat, `tuman:${d.slug}`);
    if (i % 2 === 1) kb.row();
  });
  kb.row().text('Barcha tumanlar', 'tuman:hammasi');
  return kb;
}

function resultsText(q: string, rows: VacancyListItem[], total: number, district: string | null): string {
  if (rows.length === 0) {
    return `«${esc(q)}» bo'yicha hozircha vakansiya yo'q. Boshqacha yozib ko'ring — masalan, «qorovul» o'rniga «qoriqchi».`;
  }
  const where = district ? ` (${districtByDbName(district)?.lat ?? district})` : '';
  const link = `${siteUrl()}/vakansiyalar?q=${encodeURIComponent(q)}${
    district ? `&tuman=${districtByDbName(district)?.slug ?? ''}` : ''
  }`;
  return (
    `«${esc(q)}»${where}: <b>${nf.format(total)}</b> ta topildi. Eng ko'p maoshlilari:\n\n` +
    rows.map(formatVacancyMessage).join('\n\n') +
    `\n\n<a href="${link}">Saytda barchasini ko'rish →</a>`
  );
}

export function createBot(): Bot {
  if (globalThis.__vakansiyaBot) return globalThis.__vakansiyaBot;
  const bot = new Bot(token());

  bot.command('start', async (ctx) => {
    const chat = ctx.chat.id;
    await upsertSubscription(chat, ctx.from?.username ?? null, null, null);
    await ctx.reply(
      "Salom! Men Toshkentdagi rasmiy bo'sh ish o'rinlari haqida xabar beraman.\n\n" +
        "Qaysi kasb bo'yicha vakansiya kerak? Bitta so'z yozing — masalan: <b>qorovul</b>, <b>hamshira</b>, <b>oshpaz</b>.",
      { parse_mode: 'HTML' },
    );
  });

  bot.command('stop', async (ctx) => {
    await deactivateSubscription(ctx.chat.id);
    await ctx.reply("Obuna to'xtatildi. Qayta yoqish uchun /start bosing.");
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      "/start — obuna bo'lish (kasb + tuman)\n" +
        '/stop — obunani to‘xtatish\n' +
        "Istalgan so'z — qidiruv (masalan: haydovchi)\n\n" +
        `Sayt: ${siteUrl()}`,
    );
  });

  // Tuman tanlandi
  bot.callbackQuery(/^tuman:(.+)$/, async (ctx) => {
    const slug = ctx.match[1];
    const chat = ctx.chat?.id;
    if (!chat) return;
    const sub = await getSubscription(chat);
    const district = slug === 'hammasi' ? null : (districtBySlug(slug)?.db ?? null);
    await upsertSubscription(chat, ctx.from.username ?? null, sub?.query_norm ?? null, district);
    await ctx.answerCallbackQuery();

    const label = district ? (districtByDbName(district)?.lat ?? district) : 'barcha tumanlar';
    await ctx.editMessageText(`Tuman: ${label}.`);

    if (sub?.query_norm) {
      const { rows, total } = await botSearch(sub.query_norm, district, 5);
      await ctx.reply(
        `Obuna saqlandi: <b>${esc(sub.query_norm)}</b>, ${esc(label)}. Har oy yangi vakansiyalar chiqqanda xabar beraman.\n\n` +
          resultsText(sub.query_norm, rows, total, district),
        { parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
      );
    }
  });

  // Oddiy matn: kasb (obuna oqimi) yoki qidiruv
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;
    const chat = ctx.chat.id;
    const qNorm = normalize(text);
    if (qNorm.length < 2) {
      await ctx.reply("Kamida 2 ta harf yozing.");
      return;
    }

    const sub = await getSubscription(chat);

    // Obuna oqimida kasb kutilmoqda
    if (sub && sub.is_active && !sub.query_norm) {
      await upsertSubscription(chat, ctx.from?.username ?? null, qNorm, sub.district);
      await ctx.reply(`Kasb: <b>${esc(qNorm)}</b>. Endi tumanni tanlang:`, {
        parse_mode: 'HTML',
        reply_markup: districtKeyboard(),
      });
      return;
    }

    // Aks holda — qidiruv
    const { rows, total } = await botSearch(text, sub?.district ?? null, 5);
    await ctx.reply(resultsText(text, rows, total, sub?.district ?? null), {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  });

  bot.catch((err) => {
    console.error('telegram bot xatosi:', err.error);
  });

  globalThis.__vakansiyaBot = bot;
  return bot;
}

/** Webhook'ni saytga bog'lash (scripts/telegram-setup.ts). */
export async function setWebhook(secret: string): Promise<void> {
  const bot = new Bot(token());
  await bot.api.setWebhook(`${siteUrl()}/api/telegram`, {
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
}

export async function webhookInfo(): Promise<{ url: string; pending_update_count: number; last_error_message?: string }> {
  const bot = new Bot(token());
  const info = await bot.api.getWebhookInfo();
  return { url: info.url ?? '', pending_update_count: info.pending_update_count, last_error_message: info.last_error_message };
}

/** Bitta chatga HTML xabar (bildirishnomalar uchun). */
export async function sendHtml(chatId: number, html: string): Promise<void> {
  const bot = createBot();
  await bot.api.sendMessage(chatId, html, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
}

export type { Context };
