import { ImageResponse } from 'next/og';
import { getVacancy } from '@/lib/queries';
import { districtLabel } from '@/lib/districts';
import { formatSalary } from '@/lib/format';
import { transliterate } from '@/lib/transliterate';

export const alt = 'Vakansiya';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * PLAN §10 — ulashilganda lavozim + maosh + tuman brendli kartada ko'rinadi
 * (Telegramda chiroyli preview).
 *
 * Shrift yuklanmaydi: tashqi so'rovsiz tizim shriftida chiziladi, shunda rasm
 * har qanday muhitda ishlaydi va tez tayyorlanadi.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getVacancy(Number(id));

  // Satori standart shrifti kirill glifsiz — matnni lotinga o'giramiz.
  // Saytning standart alifbosi ham lotin, ya'ni ulashilgan karta sayt bilan mos.
  const position = transliterate(v?.position ?? 'Vakansiya', 'lat');
  const company = transliterate(v?.company_name ?? '', 'lat');
  const district = v ? districtLabel(v.district) : '';
  const salary = v ? formatSalary(v.salary === null ? null : Number(v.salary), v.salary_note) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F7F4EE',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#10233A' }} />
          <div style={{ display: 'flex', fontSize: 26, color: '#10233A', fontWeight: 700 }}>
            <span>Toshkent</span>
            <span style={{ color: '#1391A5' }}>.ish</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: position.length > 60 ? 52 : 64,
              lineHeight: 1.1,
              color: '#10233A',
              fontWeight: 700,
              display: 'flex',
            }}
          >
            {position.length > 90 ? `${position.slice(0, 88)}…` : position}
          </div>
          <div style={{ marginTop: 22, fontSize: 30, color: '#66707D', display: 'flex' }}>
            {company.length > 56 ? `${company.slice(0, 54)}…` : company}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div
            style={{
              fontSize: 44,
              fontWeight: 600,
              color: salary?.muted ? '#66707D' : '#0C6B7A',
              display: 'flex',
            }}
          >
            {salary?.text ?? ''}
          </div>
          <div style={{ fontSize: 30, color: '#66707D', display: 'flex' }}>{district}</div>
        </div>
      </div>
    ),
    size,
  );
}
