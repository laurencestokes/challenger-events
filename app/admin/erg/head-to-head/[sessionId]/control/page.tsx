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
  const [showDevNotice, setShowDevNotice] = useState(true);

  const {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    startSession,
    stopSession,
    updateCompetitors,
    competitorData,
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
  type ManualCompetitor = {
    name: string;
    age: number;
    sex: 'male' | 'female';
    weight: number;
    isManual: true;
  };

  type SelectedCompetitor = { id: string; name: string } | ManualCompetitor;

  const [newCompetitors, setNewCompetitors] = useState<SelectedCompetitor[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualSex, setManualSex] = useState<'male' | 'female'>('male');
  const [manualAge, setManualAge] = useState<number | ''>('');
  const [manualWeight, setManualWeight] = useState<number | ''>('');
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
      ? {
          sessionId,
          competitors:
            session.competitors ||
            (session.competitor1 && session.competitor2
              ? [session.competitor1, session.competitor2]
              : []),
        }
      : null,
  );

  const sessionStartedRef = useRef(false);
  const [_sessionManuallyStopped, setSessionManuallyStopped] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/erg/sessions?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Session not found');
      const data = await response.json();
      console.log('Fetched session data:', data.session);
      console.log('Session eventId:', data.session?.eventId);
      console.log('Session competitors:', data.session?.competitors);
      console.log('Session competitor1:', data.session?.competitor1);
      console.log('Session competitor2:', data.session?.competitor2);
      setSession(data.session);

      // Start the session (notify Python client) only once
      if (data.session && !sessionStartedRef.current) {
        sessionStartedRef.current = true;
        console.log('About to start session with data:', data.session);
        console.log('Session competitors before start:', data.session.competitors);
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

  // Auto-stop mock data when session ends
  useEffect(() => {
    if (sessionStatus === 'ended' && isMockRunning) {
      console.log('Session ended, stopping mock data');
      stopMockData();
    }
  }, [sessionStatus, isMockRunning, stopMockData]);

  // Cleanup mock data when component unmounts
  useEffect(() => {
    return () => {
      if (isMockRunning) {
        console.log('Component unmounting, stopping mock data');
        stopMockData();
      }
    };
  }, [isMockRunning, stopMockData]);

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
    if (newCompetitors.length === 0) {
      setError('Please select at least one competitor');
      return;
    }

    if (newCompetitors.length > 6) {
      setError('Maximum 6 competitors allowed');
      return;
    }

    // Check for duplicate competitors (ids for users, names for manual)
    const userIds = newCompetitors
      .filter((c): c is { id: string; name: string } => 'id' in c)
      .map((c) => c.id);
    if (new Set(userIds).size !== userIds.length) {
      setError('Please select different competitors');
      return;
    }
    const manualNames = newCompetitors
      .filter((c): c is ManualCompetitor => 'isManual' in c)
      .map((c) => c.name.trim().toLowerCase());
    if (new Set(manualNames).size !== manualNames.length) {
      setError('Manual competitors must have unique names');
      return;
    }

    setUpdatingCompetitors(true);
    setError('');

    try {
      // Build competitors list from mix of manual and users
      const competitors = newCompetitors.map((entry) => {
        if ('isManual' in entry) {
          if (!entry.name.trim() || entry.age <= 0 || entry.weight <= 0) {
            throw new Error('Manual competitors require valid name, age and weight');
          }
          return {
            id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: entry.name.trim(),
            age: entry.age,
            sex: entry.sex,
            weight: entry.weight,
          };
        }
        const user = users.find((u) => u.id === entry.id);
        if (!user) {
          throw new Error(`Competitor ${entry.name} not found`);
        }
        if (!user.bodyweight || !user.dateOfBirth || !user.sex) {
          throw new Error(`${user.name} is missing required profile data (weight, age, sex)`);
        }
        return {
          id: user.id,
          name: user.name,
          age: calculateAge(user.dateOfBirth!),
          sex: (user.sex === 'M' ? 'male' : 'female') as 'male' | 'female',
          weight: user.bodyweight!,
        };
      });

      // Update via API
      const response = await fetch('/api/erg/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          competitors,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update competitors');
      }

      // Update via socket
      console.log('Calling updateCompetitors with:', { competitors });
      updateCompetitors(competitors);

      // Update local session state
      if (session) {
        const updatedSession = {
          ...session,
          competitors,
        };
        console.log('Updated session with new competitors:', updatedSession);
        setSession(updatedSession);
      }

      // Reset selections
      setNewCompetitors([]);
      setManualName('');
      setManualAge('');
      setManualWeight('');
      setManualSex('male');

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
      setSessionManuallyStopped(true);
      stopSession();
      stopMockData(); // Also stop the mock data
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

          {showDevNotice && (
            <div className="mb-6 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 text-yellow-300 relative">
              <div className="pr-8">
                <h3 className="font-semibold mb-1">Reminder!</h3>
                <p className="text-sm">
                  This head-to-head feature is still under development but functional.
                </p>
              </div>
              <button
                aria-label="Dismiss"
                onClick={() => setShowDevNotice(false)}
                className="absolute top-2 right-2 text-yellow-300 hover:text-yellow-200"
              >
                ×
              </button>
            </div>
          )}

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
                      competitorData.length > 0
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-yellow-900/30 text-yellow-400'
                    }`}
                  >
                    {competitorData.length > 0 ? 'Streaming' : 'Waiting'}
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
              <h3 className="text-lg font-semibold text-white mb-4">
                Competitors (
                {session.competitors?.length ||
                  (session.competitor1 && session.competitor2 ? 2 : 0)}
                )
              </h3>
              <div
                className={`grid gap-6 ${
                  (session.competitors?.length ||
                    (session.competitor1 && session.competitor2 ? 2 : 0)) === 1
                    ? 'grid-cols-1'
                    : (session.competitors?.length ||
                          (session.competitor1 && session.competitor2 ? 2 : 0)) === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                }`}
              >
                {(
                  session.competitors ||
                  (session.competitor1 && session.competitor2
                    ? [session.competitor1, session.competitor2]
                    : [])
                ).map((competitor, index) => {
                  const data = competitorData[index];
                  const colors = [
                    {
                      bg: 'bg-blue-900/20',
                      border: 'border-blue-700/50',
                      text: 'text-blue-400',
                      label: 'text-blue-400',
                    },
                    {
                      bg: 'bg-purple-900/20',
                      border: 'border-purple-700/50',
                      text: 'text-purple-400',
                      label: 'text-purple-400',
                    },
                    {
                      bg: 'bg-green-900/20',
                      border: 'border-green-700/50',
                      text: 'text-green-400',
                      label: 'text-green-400',
                    },
                    {
                      bg: 'bg-yellow-900/20',
                      border: 'border-yellow-700/50',
                      text: 'text-yellow-400',
                      label: 'text-yellow-400',
                    },
                    {
                      bg: 'bg-red-900/20',
                      border: 'border-red-700/50',
                      text: 'text-red-400',
                      label: 'text-red-400',
                    },
                    {
                      bg: 'bg-pink-900/20',
                      border: 'border-pink-700/50',
                      text: 'text-pink-400',
                      label: 'text-pink-400',
                    },
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div key={competitor.id}>
                      <h4 className={`font-semibold ${color.label} mb-2`}>
                        Competitor {index + 1}
                      </h4>
                      <p className="text-xl font-bold text-white mb-1">{competitor.name}</p>
                      <p className="text-sm text-gray-400">
                        {competitor.age} years, {competitor.sex}
                      </p>
                      <p className="text-sm text-gray-400">{competitor.weight}kg</p>
                      {data ? (
                        <div className={`mt-4 p-4 ${color.bg} border ${color.border} rounded-lg`}>
                          <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                              <span className={`text-3xl font-bold ${color.text}`}>
                                {data.calculatedScore.toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-400 uppercase">Score</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-700/50">
                              <div>
                                <p className="text-xs text-gray-400 uppercase">Distance</p>
                                <p className={`text-lg font-semibold ${color.text}`}>
                                  {data.metrics.distance_m.toFixed(0)}m
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase">Pace</p>
                                <p className={`text-lg font-semibold ${color.text}`}>
                                  {(() => {
                                    const s = data.metrics.average_pace_s;
                                    const m = Math.floor(s / 60);
                                    const rem = s - m * 60;
                                    const remStr = rem < 10 ? `0${rem.toFixed(1)}` : rem.toFixed(1);
                                    return `${m}:${remStr}`;
                                  })()}{' '}
                                  /500m
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase">Power</p>
                                <p className={`text-lg font-semibold ${color.text}`}>
                                  {data.metrics.average_power_W.toFixed(0)}W
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase">Time</p>
                                <p className={`text-lg font-semibold ${color.text}`}>
                                  {Math.floor(data.metrics.duration_s / 60)}:
                                  {String(Math.floor(data.metrics.duration_s % 60)).padStart(
                                    2,
                                    '0',
                                  )}
                                </p>
                              </div>
                              {data.metrics.heartRate && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase">Heart Rate</p>
                                  <p className={`text-lg font-semibold ${color.text}`}>
                                    {data.metrics.heartRate} bpm
                                  </p>
                                </div>
                              )}
                              {data.metrics.strokeRate && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase">Stroke Rate</p>
                                  <p className={`text-lg font-semibold ${color.text}`}>
                                    {data.metrics.strokeRate} spm
                                  </p>
                                </div>
                              )}
                              {data.metrics.calories && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase">Calories</p>
                                  <p className={`text-lg font-semibold ${color.text}`}>
                                    {data.metrics.calories} kcal
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`mt-4 p-4 ${color.bg} border ${color.border} rounded-lg opacity-50`}
                        >
                          <p className="text-sm text-gray-400 text-center">Waiting for data...</p>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Competitors ({newCompetitors.length}/6)
                  </label>
                  <div className="space-y-3">
                    {/* Selected Competitors */}
                    {newCompetitors.map((competitor, index) => {
                      const key = 'id' in competitor ? competitor.id : `manual_${index}`;
                      const detail =
                        'isManual' in competitor
                          ? `${competitor.age}y, ${competitor.sex}, ${competitor.weight}kg`
                          : '';
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                        >
                          <span className="text-orange-500 font-medium w-8">{index + 1}.</span>
                          <span className="text-white flex-1">
                            {competitor.name}
                            {detail && (
                              <span className="text-gray-400 text-xs ml-2">({detail})</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewCompetitors((prev) => prev.filter((_c, i) => i !== index))
                            }
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}

                    {/* Add Competitor Dropdown */}
                    {newCompetitors.length < 6 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const user = users.find((u) => u.id === e.target.value);
                            if (
                              user &&
                              !newCompetitors.find((c) => 'id' in c && c.id === user.id)
                            ) {
                              setNewCompetitors((prev) => [
                                ...prev,
                                { id: user.id, name: user.name },
                              ]);
                            }
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Add Competitor ({newCompetitors.length + 1})</option>
                        {users
                          .filter(
                            (user) => !newCompetitors.find((c) => 'id' in c && c.id === user.id),
                          )
                          .map((user) => {
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
                    )}

                    {newCompetitors.length < 6 && (
                      <div className="mt-6 pt-6 border-t border-gray-700/50">
                        <div className="mb-3">
                          <span className="text-gray-300 text-sm font-medium">
                            Or add manual competitor
                          </span>
                        </div>
                        <div className="bg-gray-800/40 border border-gray-700/60 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Name</label>
                              <input
                                type="text"
                                placeholder="e.g., Jane Doe"
                                value={manualName}
                                onChange={(e) => setManualName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sex</label>
                              <select
                                value={manualSex}
                                onChange={(e) => setManualSex(e.target.value as 'male' | 'female')}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Age</label>
                              <input
                                type="number"
                                placeholder="Age"
                                value={manualAge}
                                onChange={(e) =>
                                  setManualAge(e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                Weight (kg)
                              </label>
                              <input
                                type="number"
                                placeholder="kg"
                                value={manualWeight}
                                onChange={(e) =>
                                  setManualWeight(
                                    e.target.value === '' ? '' : Number(e.target.value),
                                  )
                                }
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    !manualName.trim() ||
                                    manualAge === '' ||
                                    manualWeight === '' ||
                                    Number(manualAge) <= 0 ||
                                    Number(manualWeight) <= 0
                                  ) {
                                    setError(
                                      'Enter a valid name, age and weight for manual competitor',
                                    );
                                    return;
                                  }
                                  setError('');
                                  setNewCompetitors((prev) => [
                                    ...prev,
                                    {
                                      name: manualName.trim(),
                                      age: Number(manualAge),
                                      sex: manualSex,
                                      weight: Number(manualWeight),
                                      isManual: true,
                                    },
                                  ]);
                                  setManualName('');
                                  setManualAge('');
                                  setManualWeight('');
                                  setManualSex('male');
                                }}
                                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                              >
                                Add Manual Competitor
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {newCompetitors.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">
                        Select at least one competitor to update
                      </p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleUpdateCompetitors}
                  disabled={updatingCompetitors || newCompetitors.length === 0}
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
