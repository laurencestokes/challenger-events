import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket-client';

export interface ErgMetrics {
  average_power_W: number; // watts
  average_pace_s: number; // seconds per 500m
  duration_s: number; // duration in seconds
  distance_m: number; // distance in meters
  heartRate?: number; // bpm (optional, not in current data)
  strokeRate?: number; // strokes per minute (optional, not in current data)
  calories?: number; // calories (optional, not in current data)
}

export interface ErgUpdate {
  competitorIndex: number; // 0-5 for up to 6 competitors
  metrics: ErgMetrics;
  calculatedScore: number;
  timestamp: string;
}

export interface Competitor {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female';
  weight: number; // kg
}

export interface HeadToHeadSession {
  id: string;
  competitors?: Competitor[]; // 1-6 competitors (new format)
  competitor1?: Competitor; // Legacy format
  competitor2?: Competitor; // Legacy format
  eventId?: string;
  eventType?: string;
}

export interface TeamErgSession {
  id: string;
  teamA: {
    id: string;
    name: string;
    members: Competitor[];
  };
  teamB: {
    id: string;
    name: string;
    members: Competitor[];
  };
  eventId?: string;
  eventType?: string;
  sessionType: 'team' | 'head-to-head';
}

export interface TeamErgUpdate {
  teamId: string;
  participantId: string;
  participantName: string;
  metrics: ErgMetrics;
  calculatedScore: number;
  timestamp: string;
}

export interface TeamScore {
  teamId: string;
  teamName: string;
  totalScore: number;
  participantScores: {
    participantId: string;
    participantName: string;
    score: number;
    isActive: boolean;
  }[];
}

interface UseErgSocketReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  startSession: (session: HeadToHeadSession) => void;
  stopSession: () => void;
  updateCompetitors: (competitors: Competitor[]) => void;
  competitorData: ErgUpdate[]; // Array of competitor data
  sessionStatus: 'idle' | 'starting' | 'active' | 'ended';
  error: string | null;
}

export function useErgSocket(sessionId: string | null): UseErgSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [competitorData, setCompetitorData] = useState<ErgUpdate[]>(new Array(6).fill(undefined));
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'starting' | 'active' | 'ended'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const handleConnect = () => {
      console.log('Socket connected');
      setIsConnected(true);
      setError(null);

      // Join session room if sessionId exists
      if (sessionId) {
        socket.emit('session:join', sessionId);
        setSessionStatus('active');
      }
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        setError('Server disconnected. Reconnecting...');
      } else if (reason === 'transport close') {
        setError('Connection lost. Reconnecting...');
      }
    };

    const handleReconnectAttempt = (attemptNumber: number) => {
      console.log('Reconnection attempt:', attemptNumber);
      setIsReconnecting(true);
      setReconnectAttempt(attemptNumber);
      setError(`Reconnecting... (attempt ${attemptNumber})`);
    };

    const handleReconnect = (attemptNumber: number) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setError(null);

      // Re-join session room after reconnection
      if (sessionId) {
        socket.emit('session:join', sessionId);
        setSessionStatus('active');
      }
    };

    const handleReconnectError = (error: Error) => {
      console.error('Reconnection error:', error);
      setError(`Reconnection failed: ${error.message}`);
    };

    const handleReconnectFailed = () => {
      console.error('Reconnection failed after all attempts');
      setIsReconnecting(false);
      setError('Unable to reconnect. Please refresh the page.');
    };

    const handleErgUpdate = (data: ErgUpdate) => {
      setCompetitorData((prev) => {
        const newData = [...prev];
        // Ensure the array is large enough for the competitor index
        while (newData.length <= data.competitorIndex) {
          newData.push(undefined as any);
        }
        newData[data.competitorIndex] = data;
        return newData;
      });
    };

    const handleSessionEnded = (data: any) => {
      setSessionStatus('ended');
    };

    const handlePythonDisconnected = () => {
      console.warn('Python client disconnected');
      setError('Connection to erg system lost');
    };

    const handleSessionData = (data: any) => {
      console.log('Session data received:', data);
      setSessionStatus('active');
    };

    const handleCompetitorsUpdated = (data: any) => {
      // Initialize competitor data array to max size (6) to avoid array expansion issues
      const newArray = new Array(6).fill(undefined);
      setCompetitorData(newArray);
      setSessionStatus('active');
    };

    // Attach event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_error', handleReconnectError);
    socket.on('reconnect_failed', handleReconnectFailed);
    socket.on('erg:update', handleErgUpdate);
    socket.on('session:ended', handleSessionEnded);
    socket.on('session:python-disconnected', handlePythonDisconnected);
    socket.on('session:data', handleSessionData);
    socket.on('session:competitors-updated', handleCompetitorsUpdated);

    // Connect socket
    connectSocket();

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_error', handleReconnectError);
      socket.off('reconnect_failed', handleReconnectFailed);
      socket.off('erg:update', handleErgUpdate);
      socket.off('session:ended', handleSessionEnded);
      socket.off('session:python-disconnected', handlePythonDisconnected);
      socket.off('session:data', handleSessionData);
      socket.off('session:competitors-updated', handleCompetitorsUpdated);
    };
  }, [sessionId]);

  const startSession = useCallback((session: HeadToHeadSession) => {
    const socket = socketRef.current;
    setSessionStatus('starting');

    // Handle both new and legacy session formats
    const competitors =
      session.competitors ||
      (session.competitor1 && session.competitor2
        ? [session.competitor1, session.competitor2]
        : []);

    console.log('Starting session with competitors:', competitors);
    console.log('Session data:', session);

    // Don't start session if no competitors
    if (competitors.length === 0) {
      console.warn('No competitors found, not starting session');
      setSessionStatus('idle');
      return;
    }

    socket.emit('session:start', {
      sessionId: session.id,
      competitors,
      eventId: session.eventId,
      eventType: session.eventType,
    });

    setSessionStatus('active');
  }, []);

  const stopSession = useCallback(() => {
    const socket = socketRef.current;
    if (sessionId) {
      socket.emit('session:stop', {
        sessionId,
      });
      setSessionStatus('ended');
    }
  }, [sessionId]);

  const updateCompetitors = useCallback(
    (competitors: Competitor[]) => {
      const socket = socketRef.current;
      console.log('useErgSocket: updateCompetitors called with:', {
        competitors,
        sessionId,
      });
      if (sessionId) {
        console.log('useErgSocket: Emitting session:update-competitors event');
        socket.emit('session:update-competitors', {
          sessionId,
          competitors,
        });
        // Clear current data when updating competitors
        setCompetitorData([]);
        console.log('useErgSocket: Cleared competitor data');
      } else {
        console.log('useErgSocket: No sessionId, not emitting event');
      }
    },
    [sessionId],
  );

  return {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    startSession,
    stopSession,
    updateCompetitors,
    competitorData,
    sessionStatus,
    error,
  };
}
