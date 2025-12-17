import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { createTestQueryClient } from '@/test/utils/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children?: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useDashboardData Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches dashboard data successfully', async () => {
    const sampleDashboard = {
      latestMeasurement: {
        id: 'm1',
        timestamp: 1600000000,
        voltage: 230.5,
        current: 15.2,
        frequency: 50.0,
      },
      waveformData: {
        voltage: Array(200).fill(230),
        current: Array(200).fill(15),
      },
    };

    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleDashboard,
    });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(sampleDashboard);
      expect(result.current.error).toBeNull();
    });
  });

  it('handles fetch error', async () => {
    const err = new Error('Failed to fetch dashboard');
    (api.get as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });
  });

  it('calls the correct API endpoint', async () => {
    const sampleDashboard = {
      latestMeasurement: { id: 'm1', timestamp: 1600000000 },
      waveformData: { voltage: [], current: [] },
    };

    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleDashboard,
    });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/api/dashboard');
  });

  it('does not refetch on window focus', async () => {
    const sampleDashboard = {
      latestMeasurement: { id: 'm1', timestamp: 1600000000 },
      waveformData: { voltage: [], current: [] },
    };

    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: sampleDashboard,
    });

    renderHook(() => useDashboardData(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    // Simulate window focus event
    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      // Should still only be called once due to refetchOnWindowFocus: false
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });
});