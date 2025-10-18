import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SSEEvent {
  type: 'connected' | 'heartbeat' | 'workout_revealed' | 'workout_updated';
  eventId?: string;
  message?: string;
  workoutId?: string;
  workoutName?: string;
  timestamp?: string;
}

interface UseSSEReturn {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  error: string | null;
}

export function useSSE(eventId: string): UseSSEReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !eventId) {
      console.log('SSE: Missing user or eventId', {
        user: !!user,
        userId: user?.id,
        eventId,
      });
      return;
    }

    console.info('SSE: Attempting to connect to', `/api/events/${eventId}/workout-reveals`);
    console.log('SSE: Using user ID:', user.id);

    const connectSSE = () => {
      try {
        // Close existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        const url = `/api/events/${eventId}/workout-reveals?token=${user.id}`;
        console.info('SSE: Connecting to URL:', url);

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.info('SSE: Connection opened');
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.info('SSE: Received data:', data);
            setLastEvent(data);
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          setIsConnected(false);
          setError('Connection lost');

          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.info('SSE: Attempting to reconnect...');
            connectSSE();
          }, 5000);
        };
      } catch (err) {
        console.error('SSE setup error:', err);
        setIsConnected(false);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    connectSSE();

    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
    };
  }, [user, eventId]);

  return { isConnected, lastEvent, error };
}
