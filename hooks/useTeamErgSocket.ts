import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket-client';
import { ErgMetrics, TeamErgUpdate, TeamScore } from './useErgSocket';

export interface TeamErgSession {
  id: string;
  teamA: {
    id: string;
    name: string;
    members: {
      id: string;
      name: string;
      age: number;
      sex: 'male' | 'female';
      weight: number;
    }[];
  };
  teamB: {
    id: string;
    name: string;
    members: {
      id: string;
      name: string;
      age: number;
      sex: 'male' | 'female';
      weight: number;
    }[];
  };
  eventId?: string;
  sessionType: 'team' | 'head-to-head';
}

interface UseTeamErgSocketReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  startSession: (session: TeamErgSession) => void;
  stopSession: () => void;
  teamScores: TeamScore[];
  participantUpdates: TeamErgUpdate[];
  sessionStatus: 'idle' | 'starting' | 'active' | 'ended';
  error: string | null;
}

export function useTeamErgSocket(sessionId: string | null): UseTeamErgSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [participantUpdates, setParticipantUpdates] = useState<TeamErgUpdate[]>([]);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'starting' | 'active' | 'ended'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const handleConnect = () => {
      console.log('Team erg socket connected');
      setIsConnected(true);
      setError(null);

      // Join session room if sessionId exists
      if (sessionId) {
        socket.emit('team-session:join', sessionId);
        setSessionStatus('active');
      }
    };

    const handleDisconnect = (reason: string) => {
      console.log('Team erg socket disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        setError('Server disconnected. Reconnecting...');
      } else if (reason === 'transport close') {
        setError('Connection lost. Reconnecting...');
      }
    };

    const handleReconnectAttempt = (attemptNumber: number) => {
      console.log('Team erg reconnection attempt:', attemptNumber);
      setIsReconnecting(true);
      setReconnectAttempt(attemptNumber);
      setError(`Reconnecting... (attempt ${attemptNumber})`);
    };

    const handleReconnect = (attemptNumber: number) => {
      console.log('Team erg reconnected after', attemptNumber, 'attempts');
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setError(null);

      // Re-join session room after reconnection
      if (sessionId) {
        socket.emit('team-session:join', sessionId);
        setSessionStatus('active');
      }
    };

    const handleReconnectError = (error: Error) => {
      console.error('Team erg reconnection error:', error);
      setError(`Reconnection failed: ${error.message}`);
    };

    const handleReconnectFailed = () => {
      console.error('Team erg reconnection failed after all attempts');
      setIsReconnecting(false);
      setError('Unable to reconnect. Please refresh the page.');
    };

    const handleTeamErgUpdate = (data: TeamErgUpdate) => {
      console.log('Team erg update received:', data);
      setParticipantUpdates((prev) => {
        const existingIndex = prev.findIndex(
          (update) => update.participantId === data.participantId && update.teamId === data.teamId,
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = data;
          console.log('Updating existing participant:', data.participantId);
          console.log('New participant updates array:', updated);
          return updated;
        } else {
          console.log('Adding new participant:', data.participantId);
          const newArray = [...prev, data];
          console.log('New participant updates array:', newArray);
          return newArray;
        }
      });
    };

    const handleTeamScoreUpdate = (data: TeamScore[]) => {
      console.log('Team score update received:', data);
      console.log('Setting team scores to:', data);
      setTeamScores(data);
      console.log('Team scores state updated');
    };

    const handleCompetitorCompleted = (data: any) => {
      console.log('Competitor completed session:', data);
      // Remove the completed competitor from active participants
      setParticipantUpdates((prev) =>
        prev.filter(
          (update) =>
            !(update.participantId === data.competitorId && update.teamId === data.teamId),
        ),
      );
    };

    const handleSessionEnded = () => {
      console.log('Team erg session ended');
      setSessionStatus('ended');
    };

    const handlePythonDisconnected = () => {
      console.warn('Python client disconnected from team session');
      setError('Connection to erg system lost');
    };

    const handleSessionData = (data: any) => {
      console.log('Team erg session data received:', data);
      setSessionStatus('active');

      // Update team scores and participant data from session
      if (data.teamScores) {
        console.log('Setting team scores from session data:', Object.values(data.teamScores));
        setTeamScores(Object.values(data.teamScores));
      }
    };

    // Attach event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_error', handleReconnectError);
    socket.on('reconnect_failed', handleReconnectFailed);
    socket.on('team-erg:update', handleTeamErgUpdate);
    socket.on('team-score:update', handleTeamScoreUpdate);
    socket.on('team-competitor:completed', handleCompetitorCompleted);
    socket.on('team-session:ended', handleSessionEnded);
    socket.on('team-session:python-disconnected', handlePythonDisconnected);
    socket.on('team-session:data', handleSessionData);

    // Connect socket
    connectSocket();

    // Auto-join session room if sessionId is provided
    if (sessionId) {
      socket.emit('team-session:join', sessionId);
    }

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_error', handleReconnectError);
      socket.off('reconnect_failed', handleReconnectFailed);
      socket.off('team-erg:update', handleTeamErgUpdate);
      socket.off('team-score:update', handleTeamScoreUpdate);
      socket.off('team-competitor:completed', handleCompetitorCompleted);
      socket.off('team-session:ended', handleSessionEnded);
      socket.off('team-session:python-disconnected', handlePythonDisconnected);
      socket.off('team-session:data', handleSessionData);
    };
  }, [sessionId]);

  // Auto-join session room when sessionId changes
  useEffect(() => {
    if (sessionId && isConnected) {
      console.log('Auto-joining team session room:', sessionId);
      const socket = getSocket();
      socket.emit('team-session:join', sessionId);
    }
  }, [sessionId, isConnected]);

  const startSession = useCallback((session: TeamErgSession) => {
    const socket = socketRef.current;
    setSessionStatus('starting');

    socket.emit('team-session:start', {
      sessionId: session.id,
      teamA: session.teamA,
      teamB: session.teamB,
      sessionType: session.sessionType,
    });

    setSessionStatus('active');
  }, []);

  const stopSession = useCallback(() => {
    const socket = socketRef.current;
    if (sessionId) {
      socket.emit('team-session:stop', {
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
    teamScores,
    participantUpdates,
    sessionStatus,
    error,
  };
}
