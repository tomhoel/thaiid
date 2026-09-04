import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { Splash } from '@/components/Splash';

/**
 * Renders nothing but the splash until the session state is known, so an
 * authenticated reload never flashes the sign-in screen.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
