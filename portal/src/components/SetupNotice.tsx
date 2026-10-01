/**
 * DATABASE_URL o'rnatilmagan bo'lsa (masalan, Vercel'ga endigina joylangan sayt)
 * "Nimadir noto'g'ri ketdi" o'rniga aniq sozlash yo'riqnomasi ko'rsatiladi.
 * Baza ulanib, qayta deploy qilingach o'z-o'zidan yo'qoladi.
 */
const TEXT = {
  lat: {
    kicker: 'Sozlash',
    title: "Ma'lumot bazasi hali ulanmagan",
    lead: "Sayt ishga tushdi, lekin DATABASE_URL muhit o'zgaruvchisi yo'q. Quyidagi qadamlarni bajaring:",
    steps: [
      "supabase.com da loyiha oching → Project Settings → Database → Connection string → URI. «Transaction pooler» (port 6543) manzilini nusxalang.",
      'Vercel → loyiha → Settings → Environment Variables → DATABASE_URL = shu manzil (Production va Preview uchun).',
      'Supabase → SQL Editor → repodagi portal/supabase/schema.sql matnini ishga tushiring.',
      'Vercel → Deployments → oxirgi deploy → «Redeploy».',
      "Keyin /admin → Import orqali Excel faylni yuklang.",
    ],
    note: "Lokalda: portal/.env.local ichida DATABASE_URL=postgresql://vak:vak@127.0.0.1:5432/vakansiyalar",
  },
  cyr: {
    kicker: 'Созлаш',
    title: 'Маълумот базаси ҳали уланмаган',
    lead: 'Сайт ишга тушди, лекин DATABASE_URL муҳит ўзгарувчиси йўқ. Қуйидаги қадамларни бажаринг:',
    steps: [
      'supabase.com да лойиҳа очинг → Project Settings → Database → Connection string → URI. «Transaction pooler» (порт 6543) манзилини нусхаланг.',
      'Vercel → лойиҳа → Settings → Environment Variables → DATABASE_URL = шу манзил (Production ва Preview учун).',
      'Supabase → SQL Editor → реподаги portal/supabase/schema.sql матнини ишга туширинг.',
      'Vercel → Deployments → охирги deploy → «Redeploy».',
      'Кейин /admin → Import орқали Excel файлни юкланг.',
    ],
    note: 'Локалда: portal/.env.local ичида DATABASE_URL=postgresql://vak:vak@127.0.0.1:5432/vakansiyalar',
  },
} as const;

export function SetupNotice({ cyr }: { cyr: boolean }) {
  const t = cyr ? TEXT.cyr : TEXT.lat;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-xs font-600 uppercase tracking-wide text-chinni">{t.kicker}</p>
      <h1 className="mt-2 font-display text-xl font-600 sm:text-2xl">{t.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-tosh">{t.lead}</p>
      <ol className="mt-6 grid gap-3">
        {t.steps.map((step, i) => (
          <li key={i} className="flex gap-3 rounded-karta border border-chiziq bg-yuza p-4 text-sm leading-relaxed">
            <span className="raqam shrink-0 text-chinni">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="raqam mt-6 break-all text-xs text-tosh">{t.note}</p>
    </div>
  );
}
