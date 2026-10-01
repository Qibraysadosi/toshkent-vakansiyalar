import { VacancyCardSkeleton } from '@/components/VacancyCard';

/**
 * §5.4 — spinner emas, karta shaklidagi shimmer. `role="status"` — ekran
 * o'qigich yuklanayotganini eshitadi. Loading cookie o'qiy olmaydi (async
 * emas), shuning uchun yashirin matn ikkala alifboda.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" role="status" aria-busy="true">
      <span className="sr-only">Yuklanmoqda… · Юкланмоқда…</span>
      <div className="mb-8 max-w-2xl">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton mt-4 h-12 rounded-karta" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <div className="hidden lg:block">
          <div className="skeleton h-6 w-24 rounded" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton h-4 w-full rounded" />
            ))}
          </div>
        </div>
        <ul className="grid gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <VacancyCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
