import type { Metadata } from 'next';
import { adminEnabled, isAdmin } from '@/lib/admin-auth';
import { AdminNav } from './AdminNav';
import { LoginForm } from './forms';
import { logoutAction } from './actions';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — Admin' },
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Admin bo'limlari uchun umumiy qobiq. Kirish tekshiruvi shu yerda —
 * bironta ham bo'lim parolsiz ochilmaydi.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!adminEnabled()) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-lg font-600">Admin panel yopiq</h1>
        <p className="mt-3 text-sm text-tosh">
          <code className="rounded bg-yuza px-1.5 py-0.5">ADMIN_PASSWORD</code> muhit o&apos;zgaruvchisi
          o&apos;rnatilmagan. Uni <code className="rounded bg-yuza px-1.5 py-0.5">.env.local</code> ga
          qo&apos;shing va serverni qayta ishga tushiring.
        </p>
      </div>
    );
  }

  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <h1 className="font-display text-lg font-600">Admin panel</h1>
        <p className="mt-2 text-sm text-tosh">Davom etish uchun parolni kiriting.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-lg font-600 sm:text-xl">Admin panel</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-xs text-tosh underline underline-offset-4 hover:text-chinni">
            Chiqish
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_1fr]">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
