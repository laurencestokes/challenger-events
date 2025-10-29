'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import Button from '@/components/ui/Button';
import { HeadToHeadSession } from '@/hooks/useErgSocket';
import { EVENT_TYPES } from '@/constants/eventTypes';

interface Event {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  isTeamEvent: boolean;
}

export default function HeadToHeadSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      if (!user) {
        console.log('No user available yet, skipping fetch');
        setLoading(false);
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
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchEvents();
    }
  }, [user, authLoading, fetchEvents]);

  const createSession = async () => {
    if (!selectedEventId) {
      setError('Please select an event');
      return;
    }

    if (!selectedEventType) {
      setError('Please select an event type');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const sessionData: Omit<HeadToHeadSession, 'id'> = {
        competitors: [], // Empty competitors array - will be managed in control panel
        eventId: selectedEventId,
        eventType: selectedEventType,
      };

      const response = await fetch('/api/erg/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const { session } = await response.json();

      // Redirect to the control page for this session
      router.push(`/admin/erg/head-to-head/${session.id}/control`);
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
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
                    Erg Live
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white">
                  Create Head-to-Head Erg Competition
                </h1>
                <p className="mt-2 text-gray-400">
                  Set up live erg competitions between competitors
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} ({event.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Event Type</option>
                  {EVENT_TYPES.filter((eventType) => eventType.category === 'ENDURANCE').map(
                    (eventType) => (
                      <option key={eventType.id} value={eventType.id}>
                        {eventType.name} - {eventType.description}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="col-span-2">
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-blue-400 text-xl">ℹ️</div>
                    <div>
                      <h3 className="text-blue-400 font-medium">
                        Competitors will be managed in the control panel
                      </h3>
                      <p className="text-gray-300 text-sm mt-1">
                        After creating the session, you'll be able to add and manage competitors
                        from the control panel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={createSession}
                  disabled={creating || !selectedEventId || !selectedEventType}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {creating ? 'Creating Session...' : 'Create Session & Start'}
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
                <h3 className="font-semibold text-white mb-3">How it works:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                  <li>Select an event to pull competitors from</li>
                  <li>Choose the event type (erg endurance events only)</li>
                  <li>Select two competitors from the event participants</li>
                  <li>Click "Create Session & Start" to generate a unique session</li>
                  <li>You'll be taken to the control page where you can start the competition</li>
                  <li>A public display URL will be generated for spectators to view</li>
                  <li>
                    The Python script will receive competitor data and start streaming erg metrics
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
