import { useState, useEffect } from 'react';

interface SSEEvent {
  type: string;
  eventId?: string;
  workoutName?: string;
  message?: string;
  timestamp?: string;
}

export function useSSEUnauth(eventId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        // Create EventSource without authentication
        eventSource = new EventSource(`/api/public/events/${eventId}/workout-reveals`);

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastEvent(data);
          } catch (err) {
            console.error('Error parsing SSE message:', err);
          }
        };

        eventSource.onerror = (event) => {
          console.error('SSE connection error:', event);
          setIsConnected(false);
          setError('Connection lost. Retrying...');

          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (eventSource) {
              eventSource.close();
              connect();
            }
          }, 5000);
        };
      } catch (err) {
        console.error('Error creating SSE connection:', err);
        setError('Failed to connect to live updates');
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventId]);

  return { isConnected, lastEvent, error };
}
