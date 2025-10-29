'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import Button from '@/components/ui/Button';
import { useErgSocket, HeadToHeadSession } from '@/hooks/useErgSocket';
import { useMockErgData } from '@/hooks/useMockErgData';
import { QRCodeSVG } from 'qrcode.react';

export default function SessionControlPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<HeadToHeadSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    startSession,
    stopSession,
    updateCompetitors,
    competitor1Data,
    competitor2Data,
    sessionStatus,
    error: socketError,
  } = useErgSocket(sessionId);

  // State for updating competitors
  const [users, setUsers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      bodyweight?: number;
      dateOfBirth?: Date | string | { seconds: number };
      sex?: string;
      status?: string;
      role?: string;
    }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newCompetitor1Id, setNewCompetitor1Id] = useState('');
  const [newCompetitor2Id, setNewCompetitor2Id] = useState('');
  const [updatingCompetitors, setUpdatingCompetitors] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [events, setEvents] = useState<
    Array<{
      id: string;
      name: string;
      status: string;
    }>
  >([]);

  const {
    isRunning: isMockRunning,
    startMockData,
    stopMockData,
  } = useMockErgData(
    session
      ? { sessionId, competitor1: session.competitor1, competitor2: session.competitor2 }
      : null,
  );

  const sessionStartedRef = useRef(false);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/erg/sessions?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Session not found');
      const data = await response.json();
      console.log('Fetched session data:', data.session);
      console.log('Session eventId:', data.session?.eventId);
      setSession(data.session);

      // Start the session (notify Python client) only once
      if (data.session && !sessionStartedRef.current) {
        sessionStartedRef.current = true;
        startSession(data.session);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId, startSession]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchSession();
  }, [sessionId, fetchSession]);

  // Fetch events list
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/events', {
          headers: {
            Authorization: `Bearer ${user.uid || user.id}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setEvents(data || []);
          // If session has an eventId, set it as selected
          if (session?.eventId) {
            setSelectedEventId(session.eventId);
          }
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      }
    };

    fetchEvents();
  }, [user, session?.eventId]);

  // Fetch participants - either from selected event or all users
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!user) return;

      setLoadingUsers(true);
      try {
        let response;

        if (selectedEventId) {
          // Fetch participants from selected event
          response = await fetch(`/api/events/${selectedEventId}/participants`, {
            headers: {
              Authorization: `Bearer ${user.uid || user.id}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUsers(data.participants || []);
          }
        } else {
          // Fetch all users (admin only)
          response = await fetch('/api/admin/users', {
            headers: {
              Authorization: `Bearer ${user.uid || user.id}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            // Filter to only active competitors
            const activeCompetitors = (data.users || []).filter(
              (u: { status?: string; role?: string }) =>
                u.status === 'ACTIVE' && (u.role === 'COMPETITOR' || u.role === 'ADMIN'),
            );
            setUsers(activeCompetitors);
          }
        }
      } catch (err) {
        console.error('Error fetching participants:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchParticipants();
  }, [selectedEventId, user]);

  const calculateAge = (dateOfBirth: Date | string | { seconds: number }): number => {
    let dob: Date;

    // Handle Firestore Timestamp format
    if (dateOfBirth && typeof dateOfBirth === 'object' && 'seconds' in dateOfBirth) {
      dob = new Date(dateOfBirth.seconds * 1000);
    } else if (dateOfBirth) {
      dob = new Date(dateOfBirth);
    } else {
      return 0;
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handleUpdateCompetitors = async () => {
    if (!newCompetitor1Id || !newCompetitor2Id) {
      setError('Please select both competitors');
      return;
    }

    if (newCompetitor1Id === newCompetitor2Id) {
      setError('Please select different competitors');
      return;
    }

    setUpdatingCompetitors(true);
    setError('');

    try {
      const comp1 = users.find((u) => u.id === newCompetitor1Id);
      const comp2 = users.find((u) => u.id === newCompetitor2Id);

      if (!comp1 || !comp2) {
        throw new Error('Competitors not found');
      }

      // Validate required data
      if (!comp1.bodyweight || !comp1.dateOfBirth || !comp1.sex) {
        throw new Error(`${comp1.name} is missing required profile data (weight, age, sex)`);
      }
      if (!comp2.bodyweight || !comp2.dateOfBirth || !comp2.sex) {
        throw new Error(`${comp2.name} is missing required profile data (weight, age, sex)`);
      }

      const competitor1 = {
        id: comp1.id,
        name: comp1.name,
        age: calculateAge(comp1.dateOfBirth),
        sex: (comp1.sex === 'M' ? 'male' : 'female') as 'male' | 'female',
        weight: comp1.bodyweight,
      };

      const competitor2 = {
        id: comp2.id,
        name: comp2.name,
        age: calculateAge(comp2.dateOfBirth),
        sex: (comp2.sex === 'M' ? 'male' : 'female') as 'male' | 'female',
        weight: comp2.bodyweight,
      };

      // Update via API
      const response = await fetch('/api/erg/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          competitor1,
          competitor2,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update competitors');
      }

      // Update via socket
      console.log('Calling updateCompetitors with:', { competitor1, competitor2 });
      updateCompetitors(competitor1, competitor2);

      // Update local session state
      if (session) {
        const updatedSession = {
          ...session,
          competitor1,
          competitor2,
        };
        console.log('Updated session with new competitors:', updatedSession);
        setSession(updatedSession);
      }

      // Reset selections
      setNewCompetitor1Id('');
      setNewCompetitor2Id('');

      // Stop mock data if running (it will restart automatically with new competitors)
      if (isMockRunning) {
        console.log('Stopping mock data due to competitor update - it will restart automatically');
      }
    } catch (err) {
      console.error('Error updating competitors:', err);
      setError(err instanceof Error ? err.message : 'Failed to update competitors');
    } finally {
      setUpdatingCompetitors(false);
    }
  };

  const handleStopSession = () => {
    if (confirm('Are you sure you want to stop this session?')) {
      stopSession();
      setTimeout(() => {
        router.push('/admin/erg/head-to-head');
      }, 1000);
    }
  };

  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/erg/live/${sessionId}` : '';

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    alert('Public URL copied to clipboard!');
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

  if (error || !session) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Error</h1>
              <p className="text-gray-400 text-lg mb-6 max-w-md mx-auto">
                {error || 'Session not found'}
              </p>
              <Button
                onClick={() => router.push('/admin/erg/head-to-head')}
                className="px-6 py-3 text-white font-semibold rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: '#4682B4' }}
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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
                  <Link
                    href="/dashboard"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Dashboard
                  </Link>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <Link
                    href="/admin/erg/head-to-head"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Erg Live
                  </Link>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <span className="text-gray-900 dark:text-white text-sm font-medium">
                    Control Panel
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white">Head-to-Head Control Panel</h1>
                <p className="mt-2 text-gray-400">Session ID: {sessionId}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Status Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Connection Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Socket.IO</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      isConnected
                        ? 'bg-green-900/30 text-green-400'
                        : isReconnecting
                          ? 'bg-yellow-900/30 text-yellow-400 animate-pulse'
                          : 'bg-red-900/30 text-red-400'
                    }`}
                  >
                    {isConnected
                      ? 'Connected'
                      : isReconnecting
                        ? `Reconnecting... (${reconnectAttempt})`
                        : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Session Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm capitalize ${
                      sessionStatus === 'active'
                        ? 'bg-blue-900/30 text-blue-400'
                        : 'bg-gray-900/30 text-gray-400'
                    }`}
                  >
                    {sessionStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Python Client</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      competitor1Data || competitor2Data
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-yellow-900/30 text-yellow-400'
                    }`}
                  >
                    {competitor1Data || competitor2Data ? 'Streaming' : 'Waiting'}
                  </span>
                </div>
              </div>
              {(socketError || error) && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 text-red-400 rounded text-sm">
                  {socketError || error}
                </div>
              )}
            </div>

            {/* Competitors Card */}
            <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Competitors</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">Competitor 1</h4>
                  <p className="text-xl font-bold text-white mb-1">{session.competitor1.name}</p>
                  <p className="text-sm text-gray-400">
                    {session.competitor1.age} years, {session.competitor1.sex}
                  </p>
                  <p className="text-sm text-gray-400">{session.competitor1.weight}kg</p>
                  {competitor1Data && (
                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded">
                      <p className="text-2xl font-bold text-blue-400">
                        Score: {competitor1Data.calculatedScore.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {competitor1Data.metrics.distance_m}m @{' '}
                        {competitor1Data.metrics.average_pace_s}s/500m
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400 mb-2">Competitor 2</h4>
                  <p className="text-xl font-bold text-white mb-1">{session.competitor2.name}</p>
                  <p className="text-sm text-gray-400">
                    {session.competitor2.age} years, {session.competitor2.sex}
                  </p>
                  <p className="text-sm text-gray-400">{session.competitor2.weight}kg</p>
                  {competitor2Data && (
                    <div className="mt-4 p-3 bg-purple-900/20 border border-purple-700/50 rounded">
                      <p className="text-2xl font-bold text-purple-400">
                        Score: {competitor2Data.calculatedScore.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {competitor2Data.metrics.distance_m}m @{' '}
                        {competitor2Data.metrics.average_pace_s}s/500m
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Update Competitors Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Update Competitors</h3>
            <p className="text-sm text-gray-400 mb-4">
              Replace the current competitors with new ones. This will stop the current erg session
              and restart with the new competitors.
            </p>

            {/* Event Selection (Optional) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Event (Optional)
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">All Users</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.status})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {selectedEventId
                  ? 'Showing participants from selected event'
                  : 'Showing all active users'}
              </p>
            </div>

            {loadingUsers ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto border-primary-500"></div>
                <p className="text-gray-400 mt-2">
                  {selectedEventId ? 'Loading participants...' : 'Loading users...'}
                </p>
              </div>
            ) : users.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                {selectedEventId
                  ? 'No participants found for this event.'
                  : 'No active users found.'}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Competitor 1
                    </label>
                    <select
                      value={newCompetitor1Id}
                      onChange={(e) => setNewCompetitor1Id(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select Competitor 1</option>
                      {users.map((user) => {
                        const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
                        const hasCompleteData = user.bodyweight && user.dateOfBirth && user.sex;

                        return (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                            {hasCompleteData
                              ? ` - ${age}y, ${user.sex}, ${user.bodyweight}kg`
                              : ' - Missing profile data'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Competitor 2
                    </label>
                    <select
                      value={newCompetitor2Id}
                      onChange={(e) => setNewCompetitor2Id(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select Competitor 2</option>
                      {users.map((user) => {
                        const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
                        const hasCompleteData = user.bodyweight && user.dateOfBirth && user.sex;

                        return (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                            {hasCompleteData
                              ? ` - ${age}y, ${user.sex}, ${user.bodyweight}kg`
                              : ' - Missing profile data'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleUpdateCompetitors}
                  disabled={
                    updatingCompetitors ||
                    !newCompetitor1Id ||
                    !newCompetitor2Id ||
                    newCompetitor1Id === newCompetitor2Id
                  }
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingCompetitors ? 'Updating Competitors...' : 'Update Competitors'}
                </Button>
              </div>
            )}
          </div>

          {/* Public Display URL */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Public Display</h3>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="text"
                value={publicUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <Button
                onClick={copyPublicUrl}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Copy URL
              </Button>
            </div>
            <div className="flex items-start gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Share this URL or QR code with spectators:
                </p>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Open Public Display →
                </a>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={publicUrl} size={120} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {/* Mock Data Controls for Development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="flex gap-2 items-center">
                {!isMockRunning ? (
                  <Button
                    onClick={startMockData}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    🧪 Start Demo Mode
                  </Button>
                ) : (
                  <Button
                    onClick={stopMockData}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    ⏸️ Stop Demo Mode
                  </Button>
                )}
                {isMockRunning && (
                  <span className="text-sm text-blue-400 animate-pulse">
                    Demo data streaming...
                  </span>
                )}
                {updatingCompetitors && isMockRunning && (
                  <span className="text-sm text-yellow-400 animate-pulse">
                    Restarting demo with new competitors...
                  </span>
                )}
              </div>
            )}

            <Button
              onClick={handleStopSession}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Stop Session
            </Button>
            <Button
              onClick={() => window.open(publicUrl, '_blank')}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              View Public Display
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
