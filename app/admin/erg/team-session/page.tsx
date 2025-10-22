'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import Button from '@/components/ui/Button';
import { TeamErgSession } from '@/hooks/useErgSocket';

interface User {
  id: string;
  name: string;
  email: string;
  bodyweight?: number;
  dateOfBirth?: Date | string;
  sex?: 'M' | 'F';
}

interface Team {
  id: string;
  name: string;
  members: User[];
}

interface Event {
  id: string;
  name: string;
  startDate: string | null;
  description: string;
}

export default function TeamErgSessionSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [_users, setUsers] = useState<User[]>([]);
  const [_teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [_teamAId, _setTeamAId] = useState('');
  const [_teamBId, _setTeamBId] = useState('');
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventCompetitors, setEventCompetitors] = useState<User[]>([]);
  const [eventTypes, setEventTypes] = useState<{ id: string; name: string }[]>([]);
  const [selectedEventType, setSelectedEventType] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      if (!user) {
        console.log('No user available yet, skipping fetch');
        return;
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${user.uid || user.id}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTeams = useCallback(async () => {
    try {
      if (!user) {
        return;
      }

      const response = await fetch('/api/teams', {
        headers: {
          Authorization: `Bearer ${user.uid || user.id}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch teams');
      }

      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    }
  }, [user]);

  const fetchEvents = useCallback(async () => {
    try {
      if (!user) {
        return;
      }

      const response = await fetch('/api/events', {
        headers: {
          Authorization: `Bearer ${user.uid || user.id}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    }
  }, [user]);

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

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchUsers();
      fetchTeams();
      fetchEvents();
      fetchEventTypes();
    }
  }, [user, authLoading, fetchUsers, fetchTeams, fetchEvents, fetchEventTypes]);

  const _calculateAge = (dateOfBirth: Date | string | { seconds: number }): number => {
    let dob: Date;

    // Handle Firestore Timestamp format
    if (dateOfBirth && typeof dateOfBirth === 'object' && 'seconds' in dateOfBirth) {
      // Firestore Timestamp: convert seconds to milliseconds
      dob = new Date(dateOfBirth.seconds * 1000);
    } else if (dateOfBirth) {
      // Regular date string or Date object
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

  const createSession = async () => {
    if (!teamAName.trim() || !teamBName.trim()) {
      setError('Please enter both team names');
      return;
    }
    if (teamAName.trim() === teamBName.trim()) {
      setError('Please enter different team names');
      return;
    }
    if (!selectedEventId) {
      setError('Please select an event to get competitors from');
      return;
    }
    if (!selectedEventType) {
      setError('Please select an event type for the competition');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // Create temporary teams with empty member lists
      const sessionData: Omit<TeamErgSession, 'id'> = {
        teamA: {
          id: `temp_team_a_${Date.now()}`,
          name: teamAName.trim(),
          members: [], // Will be populated as people join
        },
        teamB: {
          id: `temp_team_b_${Date.now()}`,
          name: teamBName.trim(),
          members: [], // Will be populated as people join
        },
        eventId: selectedEventId,
        eventType: selectedEventType,
        sessionType: 'team',
      };

      const response = await fetch('/api/erg/team-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create team session');
      }

      const { session } = await response.json();

      // Redirect to the control page for this session
      router.push(`/admin/erg/team-session/${session.id}/control`);
    } catch (err) {
      console.error('Error creating team session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create team session');
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 border-primary-500"></div>
              <p className="text-white text-lg">Loading...</p>
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
                  <span className="text-gray-900 dark:text-white text-sm font-medium">
                    Team Erg Live
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white">Create Team Erg Competition</h1>
                <p className="mt-2 text-gray-400">Set up live team-based erg competitions</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
            <div className="space-y-6">
              {/* Event Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Event for Competitors
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    if (e.target.value) {
                      fetchEventCompetitors(e.target.value);
                    } else {
                      setEventCompetitors([]);
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Choose an event to get competitors from</option>
                  {events.map((event) => (
                    <option key={(event as { id: string }).id} value={(event as { id: string }).id}>
                      {(event as { name: string }).name} (
                      {(event as { startDate: string | null }).startDate
                        ? new Date((event as { startDate: string }).startDate).toLocaleDateString()
                        : 'No date'}
                      )
                    </option>
                  ))}
                </select>
                {selectedEventId && eventCompetitors.length > 0 && (
                  <p className="text-sm text-green-400 mt-2">
                    ✓ Found {eventCompetitors.length} competitors with complete profile data
                  </p>
                )}
                {selectedEventId && eventCompetitors.length === 0 && (
                  <p className="text-sm text-yellow-400 mt-2">
                    ⚠ No competitors found for this event
                  </p>
                )}
              </div>

              {/* Event Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Event Type
                </label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Choose the event type for this competition</option>
                  {eventTypes.map((eventType) => (
                    <option key={eventType.id} value={eventType.id}>
                      {eventType.name}
                    </option>
                  ))}
                </select>
                {selectedEventType && (
                  <p className="text-sm text-blue-400 mt-2">
                    ✓ All competitors will perform:{' '}
                    {eventTypes.find((et) => et.id === selectedEventType)?.name}
                  </p>
                )}
              </div>

              {/* Team Names */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Team A Name</label>
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  placeholder="Enter team A name (e.g., Red Team, Team Alpha)"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Team B Name</label>
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  placeholder="Enter team B name (e.g., Blue Team, Team Beta)"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={createSession}
                  disabled={
                    creating ||
                    !teamAName.trim() ||
                    !teamBName.trim() ||
                    !selectedEventId ||
                    !selectedEventType
                  }
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {creating ? 'Creating Session...' : 'Create Team Session & Start'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/admin')}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </Button>
              </div>

              <div className="mt-6 p-6 bg-gray-700/50 rounded-lg border border-gray-600/50">
                <h3 className="font-semibold text-white mb-3">How team erg sessions work:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                  <li>Select two teams from the dropdown above</li>
                  <li>Click "Create Team Session & Start" to generate a unique session</li>
                  <li>You'll be taken to the control page where you can manage the session</li>
                  <li>A public display URL will be generated for spectators to view</li>
                  <li>Team members can join and contribute to their team's score</li>
                  <li>The Python script will receive team data and start streaming erg metrics</li>
                  <li>Individual contributions are tracked and aggregated into team scores</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
