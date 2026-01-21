import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { DashboardDTO } from '../types/api';

/**
 * Hook to fetch initial dashboard data from backend.
 *
 * Fetches from GET /api/dashboard once on mount.
 * Real-time updates are handled by WebSocket (useWebSocket hook).
 *
 * - Includes latest measurement
 * - Includes waveform data (200 points for voltage/current)
 * - Includes recent history (last 100 measurements)
 * - No polling - WebSocket provides real-time updates
 *
 * @returns React Query result with dashboard data, loading, and error states
 */
export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get<DashboardDTO>('/api/dashboard');
      return response.data;
    },
    // No polling - WebSocket updates cache in real-time
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
