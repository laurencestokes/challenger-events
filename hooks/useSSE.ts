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
        const url = `/api/events/${eventId}/workout-reveals`;
        console.info('SSE: Connecting to URL:', url);

        // Use fetch with proper authentication
        fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user.id}`,
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        })
          .then(async (response) => {
            console.info('SSE: Fetch response status:', response.status);
            console.log('SSE: Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
              // Try to read the error response
              const errorText = await response.text();
              console.log('SSE: Error response body:', errorText);
              throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            const readStream = () => {
              reader
                .read()
                .then(({ done, value }) => {
                  if (done) {
                    console.log('SSE: Stream ended');
                    setIsConnected(false);
                    return;
                  }

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        console.info('SSE: Received data:', data);
                        setLastEvent(data);

                        if (data.type === 'connected') {
                          console.info('SSE: Connected successfully');
                          setIsConnected(true);
                          setError(null);
                        }
                      } catch (e) {
                        console.error('Error parsing SSE data:', e);
                      }
                    }
                  }

                  readStream();
                })
                .catch((err) => {
                  console.error('SSE read error:', err);
                  setIsConnected(false);
                  setError(err.message);
                });
            };

            readStream();

            // Store controller for cleanup
            eventSourceRef.current = {
              close: () => reader.cancel(),
            } as any;
          })
          .catch((err) => {
            console.error('SSE connection error:', err);
            setIsConnected(false);
            setError(err.message);
          });
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
      setIsConnected(false);
    };
  }, [user, eventId]);

  return { isConnected, lastEvent, error };
}
