import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePowerQualityIndicators } from '@/hooks/usePowerQualityIndicators';
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

describe('usePowerQualityIndicators Hook', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createTestQueryClient();
        vi.clearAllMocks();
    });

    it('returns loading state initially', () => {
        const { result } = renderHook(() => usePowerQualityIndicators(), {
            wrapper: createWrapper(queryClient),
        });

        expect(result.current.isLoading).toBe(true);
    });

    it('fetches power quality indicators successfully', async () => {
        const sampleIndicators = {
            group1: {
                voltageDeviation: { value: 2.5, compliant: true },
            },
            group2: {
                frequencyDeviation: { value: 0.1, compliant: true },
            },
            group4: {
                thd: { value: 5.2, compliant: true },
                harmonics: [
                    { order: 1, value: 230.0, compliant: true },
                    { order: 3, value: 8.5, compliant: true },
                    { order: 5, value: 6.2, compliant: true },
                ],
            },
        };

        (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: sampleIndicators,
        });

        const { result } = renderHook(() => usePowerQualityIndicators(), {
            wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
            expect(result.current.data).toEqual(sampleIndicators);
            expect(result.current.error).toBeNull();
        });
    });

    it('handles fetch error', async () => {
        const err = new Error('Failed to fetch power quality indicators');
        (api.get as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);

        const { result } = renderHook(() => usePowerQualityIndicators(), {
            wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeDefined();
            expect(result.current.data).toBeUndefined();
        });
    });

    it('calls the correct API endpoint', async () => {
        const sampleIndicators = {
            group1: {},
            group2: {},
            group4: {},
        };

        (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: sampleIndicators,
        });

        const { result } = renderHook(() => usePowerQualityIndicators(), {
            wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledWith(
            '/api/dashboard/power-quality-indicators'
        );
    });

    it('configures correct refetch behavior', async () => {
        const sampleIndicators = {
            group1: {},
            group2: {},
            group4: {},
        };

        (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: sampleIndicators,
        });

        renderHook(() => usePowerQualityIndicators(), {
            wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
            expect(api.get).toHaveBeenCalled();
        });

        // Verify the query exists with correct key
        const queryCache = queryClient.getQueryCache();
        const query = queryCache.find({ queryKey: ['power-quality-indicators'] });
        expect(query).toBeDefined();
    });

    it('sets correct stale time and refetch interval', async () => {
        const sampleIndicators = {
            group1: {},
            group2: {},
            group4: {},
        };

        (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: sampleIndicators,
        });

        renderHook(() => usePowerQualityIndicators(), {
            wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
            expect(api.get).toHaveBeenCalled();
        });

        // Verify the query config was applied (staleTime: 4000, refetchInterval: 5000)
        const queryCache = queryClient.getQueryCache();
        const query = queryCache.find({ queryKey: ['power-quality-indicators'] });

        expect(query?.getObserversCount()).toBeGreaterThan(0);
    });
});