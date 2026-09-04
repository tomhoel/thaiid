import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { Splash } from '@/components/Splash';
import { reportError } from '@/lib/reportError';

export function SignIn() {
  const { isAuthenticated, loading, signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Splash />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      reportError('SignIn.signInWithGoogle', err);
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="size-16 rounded-full border border-gold-border bg-gold-bg" />
        <h1 className="text-2xl font-semibold tracking-tight text-t1">Digital ID</h1>
        <p className="max-w-xs text-sm text-t2">
          Sign in to create and carry your identity credentials.
        </p>
      </header>

      <button
        type="button"
        onClick={handleSignIn}
        disabled={submitting}
        className="w-full max-w-xs rounded-xl border border-b2 bg-bg-card px-5 py-3.5 text-sm font-medium text-t1 transition hover:bg-bg-elevated disabled:opacity-50"
      >
        {submitting ? 'Redirecting…' : 'Continue with Google'}
      </button>

      {error ? (
        <p role="alert" className="max-w-xs text-center text-xs text-danger">
          {error}
        </p>
      ) : null}
    </main>
  );
}
