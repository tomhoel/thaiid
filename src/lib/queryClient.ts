import { QueryClient } from '@tanstack/react-query';

/**
 * No persister is wired up on purpose. Identity data must not be written to
 * browser storage as a side effect of caching — offline retention will be an
 * explicit, encrypted, user-initiated vault feature instead.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
