import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PowerQualityIndicatorsDTO } from '../types/api';

/**
 * Hook to fetch PN-EN 50160 power quality indicators from backend.
 *
 * Fetches from GET /api/dashboard/power-quality-indicators
 * Provides standardized power quality indicators according to PN-EN 50160:
 * - Group 1: Supply voltage magnitude (voltage deviation)
 * - Group 2: Supply frequency (frequency deviation)
 * - Group 4: Voltage waveform distortions (THD and harmonics, partial H1-H8)
 *
 * Each indicator includes compliance flags showing if values are within
 * PN-EN 50160 limits.
 *
 * @returns React Query result with power quality indicators, loading, and error states
 */
export function usePowerQualityIndicators() {
  return useQuery({
    queryKey: ['power-quality-indicators'],
    queryFn: async () => {
      const response = await api.get<PowerQualityIndicatorsDTO>(
        '/api/dashboard/power-quality-indicators'
      );
      return response.data;
    },
    // Refresh every 5 seconds to show updated compliance status
    refetchInterval: 5000,
    retry: false,
    staleTime: 4000,
    refetchOnWindowFocus: true,
  });
}
