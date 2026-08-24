import { createPublicClient } from '@/lib/supabase';

/**
 * 1-bosqich: poydevor holati sahifasi. Bazaga ulanish ishlayotganini
 * ko'rsatadi. To'liq bosh sahifa (hero qidiruv, tumanlar xaritasi) —
 * PLAN §6, 2–3-bosqichlarda.
 */
export const revalidate = 3600;

interface Stats {
  vacancies: number;
  positionsTotal: number;
  companies: number;
  districts: { district: string; count: number }[];
}

async function loadStats(): Promise<Stats | { error: string }> {
  try {
    const db = createPublicClient();

    const [vac, comp, rows] = await Promise.all([
      db.from('vacancies').select('*', { count: 'exact', head: true }),
      db.from('companies').select('*', { count: 'exact', head: true }),
      db.from('vacancies').select('district, positions_count'),
    ]);

    if (vac.error) throw new Error(vac.error.message);
    if (comp.error) throw new Error(comp.error.message);
    if (rows.error) throw new Error(rows.error.message);

    const byDistrict = new Map<string, number>();
    let positionsTotal = 0;
    for (const r of rows.data ?? []) {
      positionsTotal += r.positions_count;
      byDistrict.set(r.district, (byDistrict.get(r.district) ?? 0) + r.positions_count);
    }

    return {
      vacancies: vac.count ?? 0,
      positionsTotal,
      companies: comp.count ?? 0,
      districts: [...byDistrict]
        .map(([district, count]) => ({ district, count }))
        .sort((a, b) => b.count - a.count),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const nf = new Intl.NumberFormat('uz-UZ');

export default async function HomePage() {
  const stats = await loadStats();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-siyoh">Toshkent vakansiyalari</h1>
      <p className="mt-3 text-tosh">
        Rasmiy oylik bazadan yig&apos;ilgan bo&apos;sh ish o&apos;rinlari.
      </p>

      {'error' in stats ? (
        <section className="mt-10 rounded-lg border border-tosh/30 bg-white p-6">
          <h2 className="font-semibold">Baza hali ulanmagan</h2>
          <p className="mt-2 text-sm text-tosh">
            <code className="rounded bg-qogoz px-1">.env.local</code> faylida Supabase kalitlarini
            to&apos;ldiring, <code className="rounded bg-qogoz px-1">supabase/schema.sql</code> ni
            qo&apos;llang va importni ishga tushiring:
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-siyoh p-3 text-xs text-qogoz">
            npm run import -- data/vakansiyalar.xlsx
          </pre>
          <p className="mt-3 text-xs text-tosh">Xato: {stats.error}</p>
        </section>
      ) : (
        <>
          <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Ish o'rni", value: stats.positionsTotal },
              { label: 'Vakansiya yozuvi', value: stats.vacancies },
              { label: 'Korxona', value: stats.companies },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-tosh/20 bg-white p-5">
                <div className="text-3xl font-semibold tabular-nums text-chinni">{nf.format(c.value)}</div>
                <div className="mt-1 text-sm text-tosh">{c.label}</div>
              </div>
            ))}
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold">Tumanlar bo&apos;yicha</h2>
            <ul className="mt-4 divide-y divide-tosh/15 rounded-lg border border-tosh/20 bg-white">
              {stats.districts.map((d) => (
                <li key={d.district} className="flex justify-between px-5 py-3 text-sm">
                  <span>{d.district}</span>
                  <span className="tabular-nums text-tosh">{nf.format(d.count)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="mt-10 text-xs text-tosh">
        1-bosqich (poydevor). Qidiruv va filtrlar — 2-bosqichda.
      </p>
    </main>
  );
}
