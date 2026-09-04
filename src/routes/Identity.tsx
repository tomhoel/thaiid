import { useAuth } from '@/features/auth/useAuth';
import { reportError } from '@/lib/reportError';

export function Identity() {
  const { email, displayName, signOut } = useAuth();

  const handleSignOut = () => {
    signOut().catch((error) => reportError('Identity.signOut', error));
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[10px] tracking-[0.2em] text-t3 uppercase">
            Cardholder
          </span>
          <span className="truncate text-sm font-medium text-t1">{displayName ?? email}</span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="shrink-0 rounded-lg border border-b2 px-3 py-2 text-xs text-t2 transition hover:text-t1"
        >
          Sign out
        </button>
      </header>

      <section className="rounded-2xl border border-b1 bg-bg-card p-6">
        <h2 className="text-sm font-medium text-t1">Wave 0 scaffold</h2>
        <p className="mt-2 text-sm text-t2">
          Auth, routing, the API layer and the PWA shell are wired. The card, country switcher and
          profile surfaces land in the next wave, on top of the Neon schema.
        </p>
      </section>
    </main>
  );
}
