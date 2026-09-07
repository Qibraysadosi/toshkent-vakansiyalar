import Link from 'next/link';
import { getScript } from '@/lib/script';
import { SearchBox } from '@/components/SearchBox';

export default async function NotFound() {
  const script = await getScript();
  const cyr = script === 'cyr';

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="raqam text-xs text-tosh">404</p>
      <h1 className="mt-2 font-display text-xl font-600 sm:text-2xl">
        {cyr ? 'Бундай саҳифа йўқ' : 'Bunday sahifa yo’q'}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-tosh">
        {cyr
          ? 'Вакансия ўчирилган ёки янги импорт билан алмашган бўлиши мумкин. Қидириб кўринг:'
          : "Vakansiya o'chirilgan yoki yangi import bilan almashgan bo'lishi mumkin. Qidirib ko'ring:"}
      </p>
      <div className="mt-6 text-left">
        <SearchBox script={script} size="kichik" />
      </div>
      <Link href="/" className="mt-6 inline-block text-xs text-chinni hover:text-chinni-toq">
        ← {cyr ? 'Бош саҳифа' : 'Bosh sahifa'}
      </Link>
    </div>
  );
}
