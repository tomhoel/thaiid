import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/components/RequireAuth';
import { TabLayout } from '@/routes/TabLayout';
import { Identity } from '@/routes/Identity';
import { CardDetails } from '@/routes/CardDetails';
import { DigitalId } from '@/routes/DigitalId';
import { Settings } from '@/routes/Settings';
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
              element={
                <RequireAuth>
                  <TabLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Identity />} />
              <Route path="/qr" element={<DigitalId />} />
              <Route path="/settings" element={<Settings />} />
              {/* Sat in the tab navigator with `href: null`: bar shown, no tab lit. */}
              <Route path="/details" element={<CardDetails />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
