'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api-client';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import { EventListSkeleton } from '@/components/SkeletonLoaders';

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
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection
            showMetrics={true}
            totalEvents={events.length}
            activeEvents={events.filter((e) => e.status === 'ACTIVE').length}
            isLoading={isLoading}
          />

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
                    Manage Events
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white">Manage Events</h1>
                <p className="mt-2 text-gray-400">View and manage all your events</p>
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
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">All Events</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <EventListSkeleton />
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400">{error}</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-lg mb-4">No events found</p>
                  <Link
                    href="/admin/events/create"
                    className="inline-flex items-center px-6 py-3 text-white font-medium rounded-lg transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#4682B4' }}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Create Your First Event
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-6 bg-gray-900/50 border border-gray-700/50 rounded-xl hover:bg-gray-900/70 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              event.status === 'ACTIVE'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : event.status === 'COMPLETED'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}
                          >
                            {event.status}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-400 mb-2">{event.description}</p>
                        )}
                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                          <span>
                            Code:{' '}
                            <span className="font-mono font-medium text-white">{event.code}</span>
                          </span>
                          <span>Start: {formatDate(event.startDate)}</span>
                          <span>End: {formatDate(event.endDate)}</span>
                          <span>Created: {formatDate(event.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
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
                            className="px-3 py-1 text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
                          >
                            Publish
                          </button>
                        )}
                        <Link
                          href={`/admin/events/${event.id}/competition-verification`}
                          className="px-3 py-1 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Weigh In
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                          style={{ backgroundColor: '#4682B4' }}
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          className="px-3 py-1 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          Edit
                        </Link>
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
