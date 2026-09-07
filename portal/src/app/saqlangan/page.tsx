import type { Metadata } from 'next';
import { getScript } from '@/lib/script';
import { SavedList } from './SavedList';

export const metadata: Metadata = {
  title: 'Saqlangan vakansiyalar',
  robots: { index: false },
};

export default async function SavedPage() {
  const script = await getScript();
  const cyr = script === 'cyr';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-xl font-600 sm:text-2xl">
        {cyr ? 'Сақланган вакансиялар' : 'Saqlangan vakansiyalar'}
      </h1>
      <p className="mt-2 text-sm text-tosh">
        {cyr
          ? 'Фақат шу қурилмада сақланади — рўйхатдан ўтиш шарт эмас.'
          : "Faqat shu qurilmada saqlanadi — ro'yxatdan o'tish shart emas."}
      </p>
      <div className="mt-8">
        <SavedList script={script} />
      </div>
    </div>
  );
}
