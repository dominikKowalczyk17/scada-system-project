import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { RealtimeDashboardDTO } from '@/types/api';

interface UseWebSocketOptions {
  url: string;
  topic: string;
  onMessage?: (data: RealtimeDashboardDTO) => void;
  onError?: (error: Error) => void;
}

/**
 * WebSocket hook for real-time dashboard updates using STOMP over SockJS.
 *
 * Connects to Spring Boot WebSocket endpoint (/ws/measurements) and subscribes
 * to STOMP topic (/topic/dashboard) for real-time dashboard data.
 *
 * Features:
 * - STOMP protocol over SockJS fallback transport
 * - Automatic reconnection with exponential backoff
 * - React Query cache integration
 * - Connection status tracking
 * - Cleanup on unmount
 *
 * Backend sends RealtimeDashboardDTO every 3 seconds with:
 * - latest_measurement (voltage, current, power, THD, harmonics)
 * - waveforms (200 samples of voltage/current sinusoid)
 * - recent_history (last N measurements)
 */
export function useWebSocket({
  url,
  topic,
  onMessage,
  onError,
}: UseWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestData, setLatestData] = useState<RealtimeDashboardDTO | null>(null);
  const queryClient = useQueryClient();

  // Stable refs for callbacks - prevents useEffect re-running on every render
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    // Create STOMP client with SockJS transport
    const client = new Client({
      webSocketFactory: () => new SockJS(url) as WebSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        setIsConnected(true);

        // Subscribe to dashboard topic
        client.subscribe(topic, (message) => {
          try {
            const data: RealtimeDashboardDTO = JSON.parse(message.body);

            // Update local state for streaming components
            setLatestData(data);

            // Update React Query cache automatically
            queryClient.setQueryData(['dashboard'], data);

            // Call custom handler if provided
            onMessageRef.current?.(data);
          } catch (err) {
            console.error('[STOMP] Failed to parse message:', err);
          }
        });
      },

      onStompError: (frame) => {
        console.error('[STOMP] Error:', frame.headers['message'], frame.body);
        setIsConnected(false);
        onErrorRef.current?.(new Error(frame.headers['message'] || 'STOMP error'));
      },

      onWebSocketClose: () => {
        setIsConnected(false);
      },

      onDisconnect: () => {
        setIsConnected(false);
      },
    });

    // Activate connection
    client.activate();
    clientRef.current = client;

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [url, topic, queryClient]);

  return {
    isConnected,
    client: clientRef.current,
    data: latestData,
  };
}
