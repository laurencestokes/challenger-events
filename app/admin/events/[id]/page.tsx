'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../lib/api-client';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';

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
}

interface Participant {
  id: string;
  name: string;
  email: string;
  score?: number;
  joinedAt: unknown;
}

export default function EventDetails() {
  const params = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const eventId = params.id as string;

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventData = await api.get(`/api/events/${eventId}`);
        setEvent(eventData);
      } catch (error: unknown) {
        console.error('Error fetching event details:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch event details';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && eventId) {
      fetchEventDetails();
    }
  }, [user, eventId]);

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

  const handlePublishEvent = async () => {
    if (!event) return;

    try {
      await api.put(`/api/events/${event.id}`, { status: 'ACTIVE' });
      // Refresh the page to show updated status
      window.location.reload();
    } catch (error: unknown) {
      console.error('Error publishing event:', error);
      setError('Failed to publish event');
    }
  };

  const handleCancelEvent = async () => {
    if (!event) return;

    try {
      await api.put(`/api/events/${event.id}`, { status: 'CANCELLED' });
      // Refresh the page to show updated status
      window.location.reload();
    } catch (error: unknown) {
      console.error('Error cancelling event:', error);
      setError('Failed to cancel event');
    }
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
                href="/admin/events"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Back to Events
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
                href="/admin/events"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Back to Events
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
                  <Link
                    href="/admin/events"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Events
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
                {event.status === 'DRAFT' && (
                  <button
                    onClick={handlePublishEvent}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-success-600 hover:bg-success-700 transition-colors"
                  >
                    Publish Event
                  </button>
                )}
                {event.status === 'ACTIVE' && (
                  <button
                    onClick={handleCancelEvent}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-error-600 hover:bg-error-700 transition-colors"
                  >
                    Cancel Event
                  </button>
                )}
                <Link
                  href={`/admin/events/${event.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Edit Event
                </Link>
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

              {/* Participants */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Participants
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {event.participants?.length || 0} participants
                  </span>
                </div>
                {event.participants && event.participants.length > 0 ? (
                  <div className="space-y-3">
                    {event.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {participant.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {participant.email}
                          </p>
                        </div>
                        <div className="text-right">
                          {participant.score !== undefined && (
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Score: {participant.score}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Joined: {formatDate(participant.joinedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No participants yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <Link
                    href={`/events/join?code=${event.code}`}
                    className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    Join Event
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
    </ProtectedRoute>
  );
}
