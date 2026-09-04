import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { Splash } from '@/components/Splash';

/**
 * Landing route for the Supabase OAuth redirect. The client parses the session
 * out of the URL on load, so this only has to wait for that to settle and then
 * hand control back to the app.
 */
export function AuthCallback() {
  const { loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate(isAuthenticated ? '/' : '/sign-in', { replace: true });
  }, [loading, isAuthenticated, navigate]);

  return <Splash />;
}
