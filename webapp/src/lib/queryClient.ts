import { QueryClient } from '@tanstack/react-query';

/**
 * React Query client configuration
 *
 * Default settings:
 * - staleTime: 3000ms (data considered fresh for 3 seconds)
 * - cacheTime: 5 minutes (unused data kept in cache)
 * - refetchOnWindowFocus: false (don't refetch when window regains focus)
 * - retry: 1 (retry failed requests once)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3000, // 3 seconds (matches WebSocket update interval)
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
