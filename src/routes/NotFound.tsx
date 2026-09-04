import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-xs tracking-[0.2em] text-t3 uppercase">404</p>
      <h1 className="text-lg font-medium text-t1">This page does not exist.</h1>
      <Link to="/" className="text-sm text-gold-light underline underline-offset-4">
        Back to your identity
      </Link>
    </main>
  );
}
