import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/components/RequireAuth';
import { Identity } from '@/routes/Identity';
import { CardDetails } from '@/routes/CardDetails';
import { SignIn } from '@/routes/SignIn';
import { AuthCallback } from '@/routes/AuthCallback';
import { NotFound } from '@/routes/NotFound';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/sign-in" element={<SignIn />} />
            {/* Clerk appends its own segments to the OAuth return URL. */}
            <Route path="/auth/callback/*" element={<AuthCallback />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Identity />
                </RequireAuth>
              }
            />
            <Route
              path="/details"
              element={
                <RequireAuth>
                  <CardDetails />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
