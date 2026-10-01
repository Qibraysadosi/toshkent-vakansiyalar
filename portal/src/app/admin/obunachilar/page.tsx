import { getLatestBatch, getSubscriptionStats, listSubscriptions } from '@/lib/queries';
import { districtLabel } from '@/lib/districts';
import { botConfigured, webhookInfo } from '@/lib/telegram';
import { siteUrl } from '@/lib/env';
import { NotifyButton } from '../forms';
import { Card, Empty, Stat, TableWrap, td, th, xato } from '../ui';

export const metadata = { title: 'Telegram' };
// Vercel: `notifyAction` (bildirishnoma yuborish) shu sahifa segmentida ishlaydi —
// 10 soniyalik standart chegarada bir necha o'n obunachidan keyin uzilardi.
// sendNotifications() 45 s byudjet bilan to'xtab `remaining` qaytaradi.
export const maxDuration = 60;

export default async function AdminSubscribersPage() {
  const enabled = botConfigured();
  const [stats, subs, batch, hook] = await Promise.all([
    getSubscriptionStats(),
    listSubscriptions(200),
    getLatestBatch(),
    enabled ? webhookInfo().catch(() => null) : Promise.resolve(null),
  ]);

  const expected = `${siteUrl()}/api/telegram`;
  const hookOk = hook?.url === expected;

  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Jami obuna" value={String(stats.total)} />
        <Stat label="Faol" value={String(stats.active)} />
        <Stat label="Xabar olgan" value={String(stats.notified)} />
      </dl>

      <Card title="Bot holati">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-chiziq py-2">
            <dt className="text-tosh">TG_BOT_TOKEN</dt>
            <dd className={enabled ? 'text-chinni' : xato}>{enabled ? "O'rnatilgan" : "O'rnatilmagan"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-chiziq py-2">
            <dt className="text-tosh">Webhook</dt>
            <dd className={`text-right ${hookOk ? 'text-chinni' : 'text-tosh'}`}>
              {!enabled ? '—' : hook === null ? "Tekshirib bo'lmadi" : hookOk ? 'Ulangan' : hook.url ? `Boshqa manzil: ${hook.url}` : "Ulanmagan — npm run telegram:setup"}
            </dd>
          </div>
          {hook?.pending_update_count ? (
            <div className="flex justify-between gap-4 border-b border-chiziq py-2">
              <dt className="text-tosh">Kutayotgan yangilanishlar</dt>
              <dd className="raqam">{hook.pending_update_count}</dd>
            </div>
          ) : null}
          {hook?.last_error_message && (
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-tosh">Oxirgi xato</dt>
              <dd className={`text-right text-xs ${xato}`}>{hook.last_error_message}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-tosh">
          Kutilgan webhook manzili: <code className="rounded bg-fon px-1.5 py-0.5">{expected}</code>. Lokalda
          webhook ishlamaydi (Telegram lokal manzilga yeta olmaydi) — deploydan keyin{' '}
          <code className="rounded bg-fon px-1.5 py-0.5">npm run telegram:setup</code> ishga tushiring.
        </p>
      </Card>

      <Card
        title="Yangi vakansiyalardan xabar berish"
        lead={batch ? `Oxirgi batch: ${batch}. Har obunachiga kasbi va tumaniga mos, shu batchdagi eng ko'p maoshli 5 ta vakansiya yuboriladi.` : 'Avval import qiling.'}
      >
        <NotifyButton enabled={enabled && Boolean(batch)} active={stats.active} />
      </Card>

      <Card title={`Obunachilar (${subs.length})`}>
        {subs.length === 0 ? (
          <Empty>Hali obunachi yo&apos;q. Bot ishga tushgach, /start bosganlar shu yerda ko&apos;rinadi.</Empty>
        ) : (
          <TableWrap>
            <table className="w-full">
              <thead>
                <tr className="border-b border-chiziq">
                  <th scope="col" className={th}>Foydalanuvchi</th>
                  <th scope="col" className={th}>Kasb</th>
                  <th scope="col" className={th}>Tuman</th>
                  <th scope="col" className={th}>Holat</th>
                  <th scope="col" className={`${th} text-right`}>Oxirgi xabar</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-chiziq last:border-0">
                    <td className={td}>{s.username ? `@${s.username}` : <span className="raqam text-tosh">{s.tg_chat_id}</span>}</td>
                    <td className={td}>{s.query_norm ?? <span className="text-tosh">—</span>}</td>
                    <td className={`${td} whitespace-nowrap`}>{s.district ? districtLabel(s.district) : <span className="text-tosh">Hammasi</span>}</td>
                    <td className={`${td} text-xs ${s.is_active ? 'text-chinni' : 'text-tosh'}`}>{s.is_active ? 'Faol' : "To'xtatilgan"}</td>
                    <td className={`${td} text-right text-xs text-tosh whitespace-nowrap`}>{s.notified_at ? new Date(s.notified_at).toLocaleDateString('ru-RU') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
