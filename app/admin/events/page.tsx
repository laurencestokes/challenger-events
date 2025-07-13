'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api-client';
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
}

export default function ManageEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsData = await api.get('/api/events');
        console.log('Events data:', eventsData);
        console.log(
          'First event dates:',
          eventsData[0]
            ? {
                startDate: eventsData[0].startDate,
                endDate: eventsData[0].endDate,
                createdAt: eventsData[0].createdAt,
                startDateType: typeof eventsData[0].startDate,
                endDateType: typeof eventsData[0].endDate,
                createdAtType: typeof eventsData[0].createdAt,
              }
            : 'No events',
        );
        setEvents(eventsData);
      } catch (error: unknown) {
        console.error('Error fetching events:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchEvents();
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200';
      case 'COMPLETED':
        return 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200';
      case 'CANCELLED':
        return 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200';
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
        const date = new Date((dateString as { seconds: number }).seconds * 1000); // Convert seconds to milliseconds
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
                    Manage Events
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Events</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  View and manage all your events
                </p>
              </div>
              <Link
                href="/admin/events/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Create New Event
              </Link>
            </div>
          </div>

          {/* Events List */}
          <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">All Events</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading events...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-error-600 dark:text-error-400">{error}</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No events found.</p>
                  <Link
                    href="/admin/events/create"
                    className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-accent-400 hover:bg-accent-500 transition-colors"
                  >
                    Create Your First Event
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-challenger transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {event.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}
                            >
                              {event.status}
                            </span>
                          </div>
                          {event.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {event.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                            <span>
                              Code: <span className="font-mono font-medium">{event.code}</span>
                            </span>
                            <span>Start: {formatDate(event.startDate)}</span>
                            <span>End: {formatDate(event.endDate)}</span>
                            <span>Created: {formatDate(event.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {event.status === 'DRAFT' && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.put(`/api/events/${event.id}`, { status: 'ACTIVE' });
                                  // Refresh the page to show updated status
                                  window.location.reload();
                                } catch (error: unknown) {
                                  console.error('Error publishing event:', error);
                                }
                              }}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium"
                            >
                              Publish
                            </button>
                          )}
                          <Link
                            href={`/admin/events/${event.id}/competition-verification`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                          >
                            Weigh In
                          </Link>
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/admin/events/${event.id}/edit`}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
