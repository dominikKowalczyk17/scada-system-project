import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { MeasurementDTO } from '../types/api';

interface UseHistoryDataOptions {
  from?: number; // Unix timestamp in seconds
  to?: number;   // Unix timestamp in seconds
  limit?: number; // Max 1000
}

/**
 * Hook to fetch historical measurement data from backend.
 *
 * Fetches from GET /api/measurements/history
 *
 * @param options - Query parameters for filtering history
 * @returns React Query result with historical measurements
 */
export function useHistoryData(options: UseHistoryDataOptions = {}) {
  const { from, to, limit = 100 } = options;

  return useQuery({
    queryKey: ['history', from, to, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.append('from', from.toString());
      if (to) params.append('to', to.toString());
      params.append('limit', limit.toString());

      const response = await api.get<MeasurementDTO[]>(
        `/api/measurements/history?${params.toString()}`
      );
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}
