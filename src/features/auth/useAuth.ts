import { useCallback } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';

export interface AuthState {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  /** True until Clerk has settled the session. Gate rendering on this. */
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

/**
 * Adapter over Clerk's hooks so routes and components depend on one small
 * surface of our own rather than on the vendor SDK directly.
 */
export function useAuth(): AuthState {
  const { isLoaded, isSignedIn, userId, signOut } = useClerkAuth();
  const { user } = useUser();

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return {
    userId: userId ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    displayName: user?.fullName ?? user?.firstName ?? null,
    loading: !isLoaded,
    isAuthenticated: Boolean(isSignedIn),
    signOut: handleSignOut,
  };
}
