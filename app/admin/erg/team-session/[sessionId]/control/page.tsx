'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import Button from '@/components/ui/Button';
import { TeamErgSession, Competitor } from '@/hooks/useErgSocket';
import { useTeamErgSocket } from '@/hooks/useTeamErgSocket';
import { useMockTeamErgData } from '@/hooks/useMockTeamErgData';
import { Socket } from 'socket.io-client';

interface ErgSlot {
  id: string;
  name: string;
  isOccupied: boolean;
  currentCompetitor?: {
    id: string;
    name: string;
    teamId: string;
    teamName: string;
    startTime: string;
  };
}

interface CompetitorAssignment {
  competitorId: string;
  competitorName: string;
  teamId: string;
  teamName: string;
  ergSlotId: string;
  eventType: string;
}

export default function TeamErgControlPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<null | undefined | TeamErgSession>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [_addingCompetitor, setAddingCompetitor] = useState(false);
  const [eventCompetitors, setEventCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('');
  const [ergSlots, setErgSlots] = useState<ErgSlot[]>([]);
  const [maxErgSlots, setMaxErgSlots] = useState(4);
  const [assigningCompetitor, setAssigningCompetitor] = useState(false);
  const [eventTypes, setEventTypes] = useState<{ id: string; name: string }[]>([]);
  const [selectedEventType, setSelectedEventType] = useState('');

  const {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    startSession,
    stopSession,
    teamScores,
    participantUpdates,
    sessionStatus,
    error: socketError,
  } = useTeamErgSocket(sessionId);

  // Debug logging
  useEffect(() => {
    console.log('Admin control panel - teamScores:', teamScores);
    console.log('Admin control panel - participantUpdates:', participantUpdates);
    console.log('Admin control panel - isConnected:', isConnected);
  }, [teamScores, participantUpdates, isConnected]);

  const {
    isRunning: isMockRunning,
    startMockData,
    stopMockData,
  } = useMockTeamErgData(
    session && eventCompetitors.length > 0
      ? {
          sessionId,
          teamA: session.teamA,
          teamB: session.teamB,
          eventCompetitors,
          eventType: session.eventType,
          maxErgSlots,
        }
      : null,
  );

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/erg/team-sessions?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Session not found');
      const data = await response.json();
      setSession(data.session);
    } catch (err) {
      console.error('Error fetching team session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const fetchEventCompetitors = useCallback(
    async (eventId: string) => {
      try {
        if (!user || !eventId) {
          return;
        }

        const response = await fetch(`/api/events/${eventId}/participants`, {
          headers: {
            Authorization: `Bearer ${user.uid || user.id}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch event participants');
        }

        const data = await response.json();
        setEventCompetitors(data.participants || []);
      } catch (err) {
        console.error('Error fetching event competitors:', err);
        setError(err instanceof Error ? err.message : 'Failed to load event competitors');
      }
    },
    [user],
  );

  const fetchEventTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/events/types');
      if (response.ok) {
        const data = await response.json();
        setEventTypes(data.eventTypes || []);
      }
    } catch (err) {
      console.error('Error fetching event types:', err);
    }
  }, []);

  const initializeErgSlots = useCallback(() => {
    const slots: ErgSlot[] = [];
    for (let i = 1; i <= maxErgSlots; i++) {
      slots.push({
        id: `erg_${i}`,
        name: `Erg ${i}`,
        isOccupied: false,
      });
    }
    setErgSlots(slots);
  }, [maxErgSlots]);

  const assignCompetitorToErg = async (competitorId: string, teamId: string, ergSlotId: string) => {
    if (!session?.eventType) {
      setError('Session event type not found');
      return;
    }

    setAssigningCompetitor(true);
    setError('');

    try {
      const competitor = eventCompetitors.find((c) => c.id === competitorId);
      if (!competitor) {
        throw new Error('Competitor not found');
      }

      const team = teamId === session?.teamA.id ? session?.teamA : session?.teamB;
      if (!team) {
        throw new Error('Team not found');
      }

      const assignment: CompetitorAssignment = {
        competitorId,
        competitorName: competitor.name,
        teamId,
        teamName: team.name,
        ergSlotId,
        eventType: session.eventType,
      };

      // Update erg slot to occupied
      setErgSlots((prev) =>
        prev.map((slot) =>
          slot.id === ergSlotId
            ? {
                ...slot,
                isOccupied: true,
                currentCompetitor: {
                  id: competitorId,
                  name: competitor.name,
                  teamId,
                  teamName: team.name,
                  startTime: new Date().toISOString(),
                },
              }
            : slot,
        ),
      );

      // Emit socket event to assign competitor
      const socket = (window as { io?: () => Socket }).io?.();
      if (socket) {
        socket.emit('team-competitor:assign', {
          sessionId,
          assignment,
        });
      }

      setSelectedCompetitorId('');
      setSelectedTeam('');
      setSelectedEventType('');
    } catch (err) {
      console.error('Error assigning competitor:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign competitor');
    } finally {
      setAssigningCompetitor(false);
    }
  };

  const completeCompetitorSession = async (ergSlotId: string) => {
    try {
      const slot = ergSlots.find((s) => s.id === ergSlotId);
      if (!slot || !slot.currentCompetitor) {
        throw new Error('No competitor found in this slot');
      }

      // Emit socket event to complete session
      const socket = (window as { io?: () => Socket }).io?.();
      if (socket) {
        socket.emit('team-competitor:complete', {
          sessionId,
          ergSlotId,
          competitorId: slot.currentCompetitor.id,
          teamId: slot.currentCompetitor.teamId,
        });
      }

      // Free up the erg slot
      setErgSlots((prev) =>
        prev.map((s) =>
          s.id === ergSlotId ? { ...s, isOccupied: false, currentCompetitor: undefined } : s,
        ),
      );
    } catch (err) {
      console.error('Error completing competitor session:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchSession();
      fetchEventTypes();
    }
  }, [user, authLoading, fetchSession, fetchEventTypes]);

  useEffect(() => {
    if (session && session.eventId) {
      fetchEventCompetitors(session.eventId);
    }
  }, [session, fetchEventCompetitors]);

  useEffect(() => {
    initializeErgSlots();
  }, [initializeErgSlots]);

  const handleStartSession = () => {
    if (session) {
      startSession(session);
    }
  };

  const handleStopSession = () => {
    stopSession();
  };

  const copyDisplayUrl = () => {
    const displayUrl = `${window.location.origin}/erg/team-live/${sessionId}`;
    navigator.clipboard.writeText(displayUrl);
    // You could add a toast notification here
  };

  const _addCompetitor = async () => {
    if (!selectedCompetitorId || !selectedTeam) {
      setError('Please select a competitor and team');
      return;
    }

    // Add competitor from event
    const competitor = eventCompetitors.find((c) => c.id === selectedCompetitorId);
    if (!competitor) {
      setError('Competitor not found');
      return;
    }

    setAddingCompetitor(true);
    setError('');

    try {
      const competitorData = {
        id: competitor.id,
        name: competitor.name,
        age: competitor.age || 25,
        sex: (competitor as { sex: string }).sex === 'M' ? ('male' as const) : ('female' as const),
        weight: (competitor as unknown as { bodyweight: number }).bodyweight || 70,
      };

      // Emit socket event to add competitor
      const socket = (window as { io?: () => Socket }).io?.();
      if (socket) {
        socket.emit('team-competitor:join', {
          sessionId,
          teamId: selectedTeam,
          competitor: competitorData,
        });
      }

      setSelectedCompetitorId('');
      setSelectedTeam('');
    } catch (err) {
      console.error('Error adding competitor:', err);
      setError(err instanceof Error ? err.message : 'Failed to add competitor');
    } finally {
      setAddingCompetitor(false);
    }
  };

  const _removeCompetitor = (competitorId: string, teamId: string) => {
    const socket = (window as { io: () => Socket }).io?.();
    if (socket) {
      socket.emit('team-competitor:leave', {
        sessionId,
        teamId,
        competitorId,
      });
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 border-primary-500"></div>
              <p className="text-white text-lg">Loading session...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!session) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4 text-white">Session Not Found</h2>
              <p className="text-gray-400">This team session does not exist.</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const teamAScore = teamScores.find((score) => score.teamId === session.teamA.id)?.totalScore || 0;
  const teamBScore = teamScores.find((score) => score.teamId === session.teamB.id)?.totalScore || 0;

  console.log('Team A ID:', session.teamA.id, 'Team B ID:', session.teamB.id);
  console.log('Team scores array:', teamScores);
  console.log('Team A score:', teamAScore, 'Team B score:', teamBScore);
  const activeParticipants = participantUpdates.filter(
    (update) => update.metrics.distance_m > 0 || update.metrics.average_pace_s > 0,
  );

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <button
                    onClick={() => router.push('/admin/erg/team-session')}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Team Sessions
                  </button>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <span className="text-gray-900 dark:text-white text-sm font-medium">
                    Control Session
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white">Team Erg Session Control</h1>
                <p className="mt-2 text-gray-400">
                  Manage team competition: {session.teamA.name} vs {session.teamB.name}
                </p>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span
                  className={`px-4 py-2 rounded-full font-semibold ${
                    isConnected
                      ? 'bg-green-500/20 text-green-400'
                      : isReconnecting
                        ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                        : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {isConnected
                    ? '🟢 CONNECTED'
                    : isReconnecting
                      ? `🟡 RECONNECTING (${reconnectAttempt})`
                      : '🔴 DISCONNECTED'}
                </span>
                <span className="text-gray-400">
                  Session Status:{' '}
                  <span className="text-white font-medium">{sessionStatus.toUpperCase()}</span>
                </span>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={handleStartSession}
                  disabled={sessionStatus === 'active' || !isConnected}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Start Session
                </Button>
                <Button
                  onClick={handleStopSession}
                  disabled={sessionStatus !== 'active'}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Stop Session
                </Button>
              </div>
            </div>
          </div>

          {/* Display URL */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-3">Public Display URL</h3>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/erg/team-live/${sessionId}`}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              />
              <Button
                onClick={copyDisplayUrl}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Copy URL
              </Button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Share this URL with spectators to view the live team competition
            </p>
          </div>

          {/* Team Scores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Team A */}
            <div className="bg-blue-500/10 rounded-2xl p-6 border border-blue-500/30">
              <h3 className="text-2xl font-bold text-blue-400 mb-4">{session.teamA.name}</h3>
              <div className="text-6xl font-bold text-blue-400 mb-4">{teamAScore.toFixed(1)}</div>
              <p className="text-gray-400 mb-4">Total Team Score</p>

              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-white">Active Participants:</h4>
                {participantUpdates
                  .filter((update) => update.teamId === session.teamA.id)
                  .map((update) => (
                    <div
                      key={update.participantId}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{update.participantName}</p>
                        <p className="text-sm text-gray-400">
                          {update.metrics.distance_m}m @ {update.metrics.average_pace_s}s/500m
                        </p>
                      </div>
                      <div className="text-right">
                        <div>
                          <p className="text-green-400 font-bold text-sm">ACTIVE</p>
                          <p className="text-xs text-gray-400">
                            {update.calculatedScore.toFixed(1)} pts
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                {participantUpdates.filter((update) => update.teamId === session.teamA.id)
                  .length === 0 && <p className="text-gray-500 text-sm">No active participants</p>}
              </div>
            </div>

            {/* Team B */}
            <div className="bg-purple-500/10 rounded-2xl p-6 border border-purple-500/30">
              <h3 className="text-2xl font-bold text-purple-400 mb-4">{session.teamB.name}</h3>
              <div className="text-6xl font-bold text-purple-400 mb-4">{teamBScore.toFixed(1)}</div>
              <p className="text-gray-400 mb-4">Total Team Score</p>

              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-white">Active Participants:</h4>
                {participantUpdates
                  .filter((update) => update.teamId === session.teamB.id)
                  .map((update) => (
                    <div
                      key={update.participantId}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{update.participantName}</p>
                        <p className="text-sm text-gray-400">
                          {update.metrics.distance_m}m @ {update.metrics.average_pace_s}s/500m
                        </p>
                      </div>
                      <div className="text-right">
                        <div>
                          <p className="text-green-400 font-bold text-sm">ACTIVE</p>
                          <p className="text-xs text-gray-400">
                            {update.calculatedScore.toFixed(1)} pts
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                {participantUpdates.filter((update) => update.teamId === session.teamB.id)
                  .length === 0 && <p className="text-gray-500 text-sm">No active participants</p>}
              </div>
            </div>
          </div>

          {/* Erg Slot Management */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Erg Slot Management</h3>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-300">Max Erg Slots:</label>
                <select
                  value={maxErgSlots}
                  onChange={(e) => setMaxErgSlots(parseInt(e.target.value))}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Erg Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {ergSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`rounded-xl p-4 border-2 ${
                    slot.isOccupied
                      ? 'bg-green-500/10 border-green-500/50'
                      : 'bg-gray-700/50 border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{slot.name}</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        slot.isOccupied
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {slot.isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                    </span>
                  </div>

                  {slot.isOccupied && slot.currentCompetitor ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-300">Competitor:</p>
                        <p className="font-medium text-white">{slot.currentCompetitor.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-300">Team:</p>
                        <p className="font-medium text-white">{slot.currentCompetitor.teamName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-300">Started:</p>
                        <p className="text-xs text-gray-400">
                          {new Date(slot.currentCompetitor.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => completeCompetitorSession(slot.id)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-sm font-medium"
                      >
                        Complete Session
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm mb-3">Available for assignment</p>
                      <Button
                        onClick={() => {
                          // This will be handled by the assignment form below
                        }}
                        disabled={!selectedCompetitorId || !selectedTeam || !selectedEventType}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
                      >
                        Assign Competitor
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Competitor Assignment Form */}
            {eventCompetitors.length > 0 && (
              <div className="border-t border-gray-600 pt-6">
                <h4 className="text-lg font-medium text-white mb-4">Assign Competitor to Erg</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Competitor
                    </label>
                    <select
                      value={selectedCompetitorId}
                      onChange={(e) => setSelectedCompetitorId(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Choose competitor</option>
                      {eventCompetitors.map((competitor) => (
                        <option key={competitor.id} value={competitor.id}>
                          {competitor.name} ({competitor.age || 'N/A'}y, {competitor.sex || 'N/A'},{' '}
                          {(competitor as unknown as { bodyweight: number }).bodyweight || 'N/A'}kg)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Team
                    </label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Choose Team</option>
                      <option value={session.teamA.id}>{session.teamA.name}</option>
                      <option value={session.teamB.id}>{session.teamB.name}</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        const availableSlot = ergSlots.find((slot) => !slot.isOccupied);
                        if (availableSlot && selectedCompetitorId && selectedTeam) {
                          assignCompetitorToErg(
                            selectedCompetitorId,
                            selectedTeam,
                            availableSlot.id,
                          );
                        }
                      }}
                      disabled={
                        assigningCompetitor ||
                        !selectedCompetitorId ||
                        !selectedTeam ||
                        ergSlots.every((slot) => slot.isOccupied)
                      }
                      className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {assigningCompetitor ? 'Assigning...' : 'Assign to Next Available Erg'}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  Select a competitor and team, then assign them to the next available erg slot. All
                  competitors will perform:{' '}
                  <span className="text-blue-400 font-medium">
                    {session?.eventType
                      ? eventTypes.find((et) => et.id === session.eventType)?.name ||
                        session.eventType
                      : 'Unknown Event'}
                  </span>
                </p>
              </div>
            )}

            {/* Development Mock Data Controls */}
            {process.env.NODE_ENV === 'development' && (
              <div className="border-t border-gray-600 pt-6">
                <h4 className="text-lg font-medium text-white mb-3">Development Mock Data</h4>
                <div className="flex items-center space-x-4 mb-4">
                  {!isMockRunning ? (
                    <Button
                      onClick={startMockData}
                      disabled={eventCompetitors.length === 0}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      🧪 Start Mock Data
                    </Button>
                  ) : (
                    <Button
                      onClick={stopMockData}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      ⏸️ Stop Mock Data
                    </Button>
                  )}
                  {isMockRunning && (
                    <span className="text-sm text-purple-400 animate-pulse">
                      Mock data streaming with hot-swapping...
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  Mock data simulates competitors joining/leaving and sends realistic erg data for
                  development.
                </p>
              </div>
            )}

            <p className="text-sm text-gray-400 mt-4">
              Add competitors as they arrive. Event participants have complete profile data for
              accurate score calculations.
            </p>
          </div>

          {/* Active Participants */}
          {activeParticipants.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">
                Currently Active Participants
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeParticipants.map((participant, _index) => {
                  const isTeamA = session.teamA.members.some(
                    (member) => member.id === participant.participantId,
                  );
                  const teamName = isTeamA ? session.teamA.name : session.teamB.name;
                  const teamColor = isTeamA ? 'blue' : 'purple';

                  return (
                    <div
                      key={`${participant.teamId}-${participant.participantId}`}
                      className={`bg-${teamColor}-500/10 rounded-xl p-4 border border-${teamColor}-500/30`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-semibold text-${teamColor}-400`}>
                          {participant.participantName}
                        </h4>
                        <span className="text-xs text-gray-400">{teamName}</span>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {participant.calculatedScore.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-400">Score</div>
                      <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>Distance: {participant.metrics.distance_m}m</span>
                        <span>Pace: {participant.metrics.average_pace_s}s/500m</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Display */}
          {(error || socketError) && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
              <p className="text-red-400">{error || socketError}</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
