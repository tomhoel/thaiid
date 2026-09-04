import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClerkProvider, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { clearTokenGetter, registerTokenGetter } from '@/lib/apiClient';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Hands the API client a way to read the current Clerk session token. Must be
 * rendered inside ClerkProvider, since getToken comes from Clerk's context.
 */
function TokenBridge() {
  const { getToken } = useClerkAuth();

  useEffect(() => {
    registerTokenGetter(() => getToken());
    return clearTokenGetter;
  }, [getToken]);

  return null;
}

/**
 * A missing key would otherwise surface as an opaque Clerk crash on first
 * render, so say plainly what is wrong instead.
 */
function MissingKeyNotice() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold text-t1">Authentication is not configured</h1>
      <p className="max-w-sm text-sm text-t2">
        Set <code className="font-mono text-t1">VITE_CLERK_PUBLISHABLE_KEY</code> in your
        environment, then restart the dev server.
      </p>
    </main>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  if (!publishableKey) {
    return <MissingKeyNotice />;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      afterSignOutUrl="/sign-in"
    >
      <TokenBridge />
      {children}
    </ClerkProvider>
  );
}
