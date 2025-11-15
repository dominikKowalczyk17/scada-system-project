import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { RealtimeDashboardDTO } from '../types/api';

/**
 * Hook to fetch dashboard data from backend
 *
 * Fetches from GET /api/dashboard
 * - Includes latest measurement
 * - Includes waveform data (200 points for voltage/current)
 * - Auto-refetches every 5 seconds as fallback (WebSocket is primary)
 *
 * @returns React Query result with dashboard data, loading, and error states
 */
export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get<RealtimeDashboardDTO>('/api/dashboard');
      return response.data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds as fallback
    staleTime: 3000,        // Data considered fresh for 3 seconds
  });
}
