'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api-client';
import NotificationToast from '@/components/NotificationToast';
import { useSSE } from '@/hooks/useSSE';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Leaderboard from '@/components/Leaderboard';
import TeamManagement from '@/components/TeamManagement';
import TeamDebug from '@/components/TeamDebug';

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: unknown;
  description?: string;
  participants?: Participant[];
  isTeamEvent?: boolean;
  teamScoringMethod?: 'SUM' | 'AVERAGE' | 'BEST';
  maxTeamSize?: number;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  score?: number;
  joinedAt: unknown;
}

export default function EventPage() {
  const params = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  const eventId = params.id as string;

  // SSE and notification state
  const { isConnected, lastEvent } = useSSE(eventId);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Handle SSE events
  useEffect(() => {
    console.log('SSE: lastEvent changed:', lastEvent);
    if (lastEvent?.type === 'workout_revealed' && lastEvent.workoutName) {
      console.log('SSE: Triggering notification for workout reveal:', lastEvent.workoutName);
      setNotification({
        show: true,
        message: `🎉 New workout revealed: ${lastEvent.workoutName}!`,
        type: 'success',
      });
    }
  }, [lastEvent]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventData = await api.get(`/api/events/${eventId}`);
        setEvent(eventData);

        // Check if user is already joined
        if (user && eventData.participants) {
          const isUserJoined = eventData.participants.some(
            (participant: Participant) => participant.id === user.id,
          );
          setIsJoined(isUserJoined);
        }
      } catch (error: unknown) {
        console.error('Error fetching event details:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch event details';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetails();
    }
  }, [user, eventId]);

  const handleJoinEvent = async () => {
    if (!event || !user) return;

    try {
      await api.post('/api/events/join', { eventCode: event.code });
      setIsJoined(true);
      // Refresh event data to show updated participants
      const eventData = await api.get(`/api/events/${eventId}`);
      setEvent(eventData);
    } catch (error: unknown) {
      console.error('Error joining event:', error);
      setError('Failed to join event');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200';
      case 'COMPLETED':
        return 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200';
      case 'CANCELLED':
        return 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200';
      case 'DRAFT':
        return 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200';
      default:
        return 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200';
    }
  };

  const formatDate = (dateString: unknown) => {
    if (!dateString) return 'Not set';

    // Handle Firestore Timestamp objects
    if (typeof dateString === 'object' && dateString !== null) {
      // Check if it's a Firestore Timestamp with seconds and nanoseconds
      if (
        'seconds' in dateString &&
        typeof (dateString as { seconds: number }).seconds === 'number'
      ) {
        const date = new Date((dateString as { seconds: number }).seconds * 1000);
        return date.toLocaleDateString();
      }

      // Check if it has toDate method (Firestore SDK Timestamp)
      if (
        'toDate' in dateString &&
        typeof (dateString as { toDate: () => Date }).toDate === 'function'
      ) {
        return (dateString as { toDate: () => Date }).toDate().toLocaleDateString();
      }
    }

    // Handle string dates
    if (typeof dateString === 'string') {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString();
    }

    // Handle Date objects
    if (dateString instanceof Date) {
      return dateString.toLocaleDateString();
    }

    // Handle numbers (timestamps)
    if (typeof dateString === 'number') {
      return new Date(dateString).toLocaleDateString();
    }

    return 'Invalid date';
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading event details...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8">
              <p className="text-error-600 dark:text-error-400">{error}</p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!event) {
    return (
      <ProtectedRoute>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Event not found.</p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
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
                    {event.name}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{event.name}</h1>
                <div className="flex items-center space-x-3 mt-2">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(event.status)}`}
                  >
                    {event.status}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Code: <span className="font-mono font-medium">{event.code}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {!isJoined && event.status === 'ACTIVE' && (
                  <button
                    onClick={handleJoinEvent}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    Join Event
                  </button>
                )}
                {isJoined && (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200">
                    ✓ Joined
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Event Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Information */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Event Information
                </h2>
                {event.description && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Description
                    </h3>
                    <p className="text-gray-900 dark:text-white">{event.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Start Date
                    </h3>
                    <p className="text-gray-900 dark:text-white">{formatDate(event.startDate)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      End Date
                    </h3>
                    <p className="text-gray-900 dark:text-white">{formatDate(event.endDate)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Created
                    </h3>
                    <p className="text-gray-900 dark:text-white">{formatDate(event.createdAt)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Status
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <Leaderboard eventId={eventId} />

              {/* Team Management - Only show for team events */}
              {event.isTeamEvent && (
                <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Team Management
                  </h2>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This is a team event.{' '}
                      {event.teamScoringMethod === 'SUM'
                        ? 'Team scores are calculated by summing all member scores.'
                        : event.teamScoringMethod === 'AVERAGE'
                          ? 'Team scores are calculated by averaging member scores.'
                          : 'Team scores are calculated by taking the best individual score.'}
                      {event.maxTeamSize && ` Maximum team size: ${event.maxTeamSize} members.`}
                    </p>
                  </div>
                  <TeamManagement eventId={eventId} />
                </div>
              )}

              {/* Team Debug - Temporary for fixing team participation */}
              <TeamDebug eventId={eventId} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  {!isJoined && event.status === 'ACTIVE' && (
                    <button
                      onClick={handleJoinEvent}
                      className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                    >
                      Join Event
                    </button>
                  )}
                  {isJoined && (
                    <div className="text-center py-2">
                      <span className="text-sm text-success-600 dark:text-success-400">
                        ✓ You&apos;re participating in this event
                      </span>
                    </div>
                  )}
                  <Link
                    href={`/events/${eventId}/brief`}
                    className="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    View Event Brief
                  </Link>
                  <button
                    onClick={() => navigator.clipboard.writeText(event.code)}
                    className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Copy Event Code
                  </button>
                </div>
              </div>

              {/* Event Stats */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Event Stats
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Participants</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.participants?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SSE Connection Status (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-40">
          <div
            className={`px-3 py-1 rounded-full text-xs ${
              isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            SSE: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      <NotificationToast
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />
    </ProtectedRoute>
  );
}
