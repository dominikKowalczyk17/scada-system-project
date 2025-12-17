import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHistoryData } from '@/hooks/useHistoryData';
import { createTestQueryClient } from '@/test/utils/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import type { MeasurementDTO } from '@/types/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children?: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useHistoryData Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useHistoryData(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches history data successfully', async () => {
    const sampleData = [
      { id: 'm1', timestamp: 1600000000, value: 123 },
      { id: 'm2', timestamp: 1600000060, value: 125 },
    ];

    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleData,
    });

    const { result } = renderHook(() => useHistoryData(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(sampleData);
      expect(result.current.error).toBeNull();
    });
  });

  it('handles fetch error', async () => {
    const err = new Error('Network failure');
    (api.get as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);

    const { result } = renderHook(() => useHistoryData(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });
  });

  it('passes query params (from,to,limit) to the API', async () => {
    const sampleData: MeasurementDTO[] = [];
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleData,
    });

    const opts = { from: 160, to: 200, limit: 10 };
    const { result } = renderHook(() => useHistoryData(opts), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(
      '/api/measurements/history?from=160&to=200&limit=10'
    );
  });
});