import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket-client';

export interface ErgMetrics {
  pace: number; // seconds per 500m
  distance: number; // meters
  heartRate?: number; // bpm
  strokeRate?: number; // strokes per minute
  power?: number; // watts
  calories?: number;
}

export interface ErgUpdate {
  competitorIndex: 0 | 1;
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
  competitor1: Competitor;
  competitor2: Competitor;
  eventId?: string;
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
  competitor1Data: ErgUpdate | null;
  competitor2Data: ErgUpdate | null;
  sessionStatus: 'idle' | 'starting' | 'active' | 'ended';
  error: string | null;
}

export function useErgSocket(sessionId: string | null): UseErgSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [competitor1Data, setCompetitor1Data] = useState<ErgUpdate | null>(null);
  const [competitor2Data, setCompetitor2Data] = useState<ErgUpdate | null>(null);
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
      console.log('Erg update received:', data);
      if (data.competitorIndex === 0) {
        setCompetitor1Data(data);
      } else {
        setCompetitor2Data(data);
      }
    };

    const handleSessionEnded = () => {
      console.log('Session ended');
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
    };
  }, [sessionId]);

  const startSession = useCallback((session: HeadToHeadSession) => {
    const socket = socketRef.current;
    setSessionStatus('starting');

    socket.emit('session:start', {
      sessionId: session.id,
      competitor1: session.competitor1,
      competitor2: session.competitor2,
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

  return {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    startSession,
    stopSession,
    competitor1Data,
    competitor2Data,
    sessionStatus,
    error,
  };
}
