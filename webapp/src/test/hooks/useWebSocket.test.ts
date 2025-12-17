import React from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { createMockRealtimeDashboard } from '@/test/utils';
import { createTestQueryClient } from '@/test/utils/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type MessageCallback = (message: { body: string }) => void;

interface MockClient {
  connected: boolean;
  activate: ReturnType<typeof vi.fn>;
  deactivate: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
}

const subscriptions = new Map<string, MessageCallback>();
let mockClient: MockClient;
let onConnectCallback: (() => void) | undefined;
let onStompErrorCallback: ((frame: { headers: Record<string, string>; body: string }) => void) | undefined;

// Mock @stomp/stompjs - MUST be at top level for Vitest hoisting
vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn().mockImplementation((config) => {
    onConnectCallback = config.onConnect;
    onStompErrorCallback = config.onStompError;

    mockClient = {
      connected: false,
      activate: vi.fn(function(this: MockClient) {
        // Connection happens asynchronously
        setTimeout(() => {
          this.connected = true;
          onConnectCallback?.();
        }, 0);
      }),
      deactivate: vi.fn(function(this: MockClient) {
        this.connected = false;
        subscriptions.clear();
      }),
      subscribe: vi.fn((topic: string, callback: MessageCallback) => {
        subscriptions.set(topic, callback);
        return {
          unsubscribe: vi.fn(() => {
            subscriptions.delete(topic);
          }),
        };
      }),
    };

    return mockClient;
  }),
}));

// Mock sockjs-client
vi.mock('sockjs-client', () => ({
  default: vi.fn(() => ({
    close: vi.fn(),
    send: vi.fn(),
    readyState: 1,
  })),
}));

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children?: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useWebSocket Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    subscriptions.clear();
    vi.clearAllMocks();
  });

  it('initializes and connects to the STOMP server', async () => {
    const { result } = renderHook(
      () => useWebSocket({ url: '/ws', topic: '/topic/test' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(mockClient.activate).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(mockClient.subscribe).toHaveBeenCalledWith(
        '/topic/test',
        expect.any(Function)
      );
    });
  });

  it('updates state and React Query cache when a message arrives', async () => {
    const mockData = createMockRealtimeDashboard();

    const { result } = renderHook(
      () => useWebSocket({ url: '/ws', topic: '/topic/dashboard' }),
      { wrapper: createWrapper(queryClient) }
    );

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Trigger message manually
    const callback = subscriptions.get('/topic/dashboard');
    expect(callback).toBeDefined();
    callback?.({ body: JSON.stringify(mockData) });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
      const cached = queryClient.getQueryData(['dashboard']);
      expect(cached).toEqual(mockData);
    });
  });

  it('handles STOMP errors correctly', async () => {
    const onError = vi.fn();

    renderHook(
      () => useWebSocket({ url: '/ws', topic: '/topic/test', onError }),
      { wrapper: createWrapper(queryClient) }
    );

    // Trigger error manually
    onStompErrorCallback?.({
      headers: { message: 'Connection Refused' },
      body: 'Connection Refused',
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      const errorArg = (onError as Mock).mock.calls[0][0];
      expect(errorArg.message).toBe('Connection Refused');
    });
  });

  it('cleans up resources on unmount', async () => {
    const { unmount } = renderHook(
      () => useWebSocket({ url: '/ws', topic: '/topic/test' }),
      { wrapper: createWrapper(queryClient) }
    );

    // Wait for activation
    await waitFor(() => {
      expect(mockClient.activate).toHaveBeenCalled();
    });

    unmount();
    expect(mockClient.deactivate).toHaveBeenCalled();
  });
});