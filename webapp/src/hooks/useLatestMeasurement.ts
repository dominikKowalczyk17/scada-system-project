import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { MeasurementDTO } from '../types/api';

/**
 * Hook to fetch latest single measurement
 *
 * Fetches from GET /api/measurements/latest
 * - Lighter than full dashboard data
 * - Useful as fallback if dashboard endpoint fails
 *
 * @returns React Query result with latest measurement
 */
export function useLatestMeasurement() {
  return useQuery({
    queryKey: ['latest-measurement'],
    queryFn: async () => {
      const response = await api.get<MeasurementDTO>('/api/measurements/latest');
      return response.data;
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
}
