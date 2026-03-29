'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api-client';
import { queryKeys } from '../../../lib/queryKeys';
import Link from 'next/link';
import ProtectedRoute from '@components/ProtectedRoute';
import WelcomeSection from '@components/WelcomeSection';
import { EventListSkeleton } from '@components/SkeletonLoaders';

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: unknown;
  description?: string;
  scope?: 'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY';
}

export default function ManageEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery<Event[]>({
    queryKey: queryKeys.events.all(),
    queryFn: () => api.get('/api/events'),
    enabled: !!user,
  });

  const publishMutation = useMutation({
    mutationFn: (eventId: string) => api.put(`/api/events/${eventId}`, { status: 'ACTIVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
    },
  });

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

  const formatScope = (scope: 'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY' | undefined) => {
    const value = scope ?? 'INVITE_ONLY';
    switch (value) {
      case 'PUBLIC':
        return 'Public';
      case 'ORGANIZATION':
        return 'Organization';
      case 'GYM':
        return 'Gym';
      case 'INVITE_ONLY':
      default:
        return 'Invite Only';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
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
                  <Link href="/dashboard" className="text-muted hover:text-text-secondary text-sm">
                    Dashboard
                  </Link>
                  <span className="text-muted">/</span>
                  <span className="text-text-primary text-sm font-medium">Manage Events</span>
                </div>
                <h1 className="text-3xl font-bold text-text-primary">Manage Events</h1>
                <p className="mt-2 text-muted">View and manage all your events</p>
              </div>
              <Link
                href="/admin/events/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-text-primary bg-primary hover:bg-primary-light transition-colors"
              >
                Create New Event
              </Link>
            </div>
          </div>

          {/* Events List */}
          <div className="panel rounded-2xl ">
            <div className="px-6 py-4 border-b border-surface-high/50">
              <h2 className="text-xl font-bold text-text-primary">All Events</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <EventListSkeleton />
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400">
                    {error instanceof Error ? error.message : 'Failed to fetch events'}
                  </p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-surface-high rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-muted"
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
                  <p className="text-muted text-lg mb-4">No events found</p>
                  <Link
                    href="/admin/events/create"
                    className="inline-flex items-center px-6 py-3 text-text-primary font-medium rounded-lg transition-colors hover:opacity-90"
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
                      className="panel p-4 sm:p-6 rounded-xl hover:bg-surface-high/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-text-primary">
                              {event.name}
                            </h3>
                            <span
                              className={`px-3 py-1 text-xs font-medium rounded-full ${
                                event.status === 'ACTIVE'
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : event.status === 'COMPLETED'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-surface-high/20 text-muted border border-gray-500/30'
                              }`}
                            >
                              {event.status}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted mb-2">{event.description}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                            <span>
                              Code:{' '}
                              <span className="font-mono font-medium text-text-primary">
                                {event.code}
                              </span>
                            </span>
                            <span>
                              Scope:{' '}
                              <span className="text-text-primary">{formatScope(event.scope)}</span>
                            </span>
                            <span>Start: {formatDate(event.startDate)}</span>
                            <span>End: {formatDate(event.endDate)}</span>
                            <span>Created: {formatDate(event.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:flex-nowrap">
                          {event.status === 'DRAFT' && (
                            <button
                              onClick={() => publishMutation.mutate(event.id)}
                              disabled={publishMutation.isPending}
                              className="px-3 py-1 text-sm font-medium text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
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
                            className="px-4 py-2 text-text-primary text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                            style={{ backgroundColor: '#4682B4' }}
                          >
                            Manage
                          </Link>
                          <Link
                            href={`/admin/events/${event.id}/edit`}
                            className="px-3 py-1 text-sm font-medium text-muted hover:text-text-secondary transition-colors"
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
