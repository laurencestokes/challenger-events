'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api-client';
import NotificationToast from '@/components/NotificationToast';
import { useSSE } from '@/hooks/useSSE';
import Link from 'next/link';
import Image from 'next/image';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TeamManagement from '@/components/TeamManagement';
import {
  LargeEventCardSkeleton,
  TeamManagementSkeleton,
  QuickActionsSkeleton,
  EventStatsSkeleton,
} from '@/components/SkeletonLoaders';

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: unknown;
  description?: string;
  imageUrl?: string;
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
    if (lastEvent?.type === 'workout_revealed' && lastEvent.workoutName) {
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

  const handleCopyEventCode = async () => {
    if (!event) return;

    try {
      await navigator.clipboard.writeText(event.code);
      setNotification({
        show: true,
        message: `Event code "${event.code}" copied to clipboard!`,
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to copy event code:', error);
      setNotification({
        show: true,
        message: 'Failed to copy event code',
        type: 'error',
      });
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

    let date: Date;

    // Handle Firestore Timestamp objects
    if (typeof dateString === 'object' && dateString !== null) {
      // Check if it's a Firestore Timestamp with seconds and nanoseconds
      if (
        'seconds' in dateString &&
        typeof (dateString as { seconds: number }).seconds === 'number'
      ) {
        date = new Date((dateString as { seconds: number }).seconds * 1000);
      } else if (
        'toDate' in dateString &&
        typeof (dateString as { toDate: () => Date }).toDate === 'function'
      ) {
        date = (dateString as { toDate: () => Date }).toDate();
      } else {
        return 'Not set';
      }
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Not set';
      }
    } else if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'number') {
      date = new Date(dateString);
    } else {
      return 'Not set';
    }

    // Format as "17th Jan 2025"
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();

    // Add ordinal suffix to day
    const getOrdinalSuffix = (day: number) => {
      if (day >= 11 && day <= 13) {
        return 'th';
      }
      switch (day % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    };

    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header />
          <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
            <div className="container mx-auto px-4 py-8">
              {/* Welcome Section Skeleton */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-full animate-pulse mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-6 bg-gray-700 rounded w-32 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-right space-y-3">
                  <div className="flex flex-col items-end">
                    <div className="h-4 bg-gray-700 rounded w-20 mb-1 animate-pulse"></div>
                    <div className="bg-gray-700 rounded-lg w-20 h-10 animate-pulse"></div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="h-4 bg-gray-700 rounded w-16 mb-1 animate-pulse"></div>
                    <div className="bg-gray-700 rounded-lg w-20 h-10 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Breadcrumbs Skeleton */}
              <div className="mb-6">
                <div className="h-4 bg-gray-700 rounded w-32 animate-pulse"></div>
              </div>

              {/* Event Header Skeleton */}
              <div className="mb-8">
                <div className="h-8 bg-gray-700 rounded w-64 mb-2 animate-pulse"></div>
                <div className="flex items-center space-x-3">
                  <div className="h-6 bg-gray-700 rounded w-16 animate-pulse"></div>
                  <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
                </div>
              </div>

              {/* Event Card Skeleton */}
              <div className="mb-8">
                <LargeEventCardSkeleton />
              </div>

              {/* Main Content Grid Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                  <div>
                    <div className="h-6 bg-gray-700 rounded w-32 mb-4 animate-pulse"></div>
                    <TeamManagementSkeleton />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  <div>
                    <div className="h-6 bg-gray-700 rounded w-24 mb-4 animate-pulse"></div>
                    <QuickActionsSkeleton />
                  </div>
                  <div>
                    <div className="h-6 bg-gray-700 rounded w-20 mb-4 animate-pulse"></div>
                    <EventStatsSkeleton />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header />
          <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
            <div className="container mx-auto px-4 py-8">
              <div className="text-center py-8">
                <p className="text-red-400">{error}</p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  if (!event) {
    return (
      <ProtectedRoute>
        <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header />
          <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
            <div className="container mx-auto px-4 py-8">
              <div className="text-center py-8">
                <p className="text-gray-400">Event not found.</p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
          <div className="container mx-auto px-4 py-8">
            {/* Welcome Section */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-xl font-bold">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-sm">Welcome Back</p>
                  <h1 className="text-white text-2xl font-bold">{user?.name || user?.email}</h1>
                </div>
              </div>
              <div className="text-right space-y-3">
                <div className="flex flex-col items-end">
                  <p className="text-white font-medium text-base mb-1">Verified Score</p>
                  <div className="bg-green-900/30 border border-green-700/50 px-3 py-2 rounded-lg w-20">
                    <span className="text-green-400 font-bold">773</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-white font-medium text-base mb-1">Total Score</p>
                  <div
                    className="px-3 py-2 rounded-lg w-20"
                    style={{
                      background:
                        'linear-gradient(90deg, #E5965E 0%, #F26004 35.58%, #C10901 67.79%, #240100 100%)',
                    }}
                  >
                    <span className="text-white font-bold">1,981</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Breadcrumbs */}
            <nav
              className="mb-6 text-sm text-gray-400 flex items-center space-x-2"
              aria-label="Breadcrumb"
            >
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-white font-semibold">{event.name}</span>
            </nav>

            {/* Event Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">{event.name}</h1>
              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(event.status)}`}
                >
                  {event.status}
                </span>
                <span className="text-sm text-gray-400">
                  Code: <span className="font-mono font-medium text-white">{event.code}</span>
                </span>
                {!isJoined && event.status === 'ACTIVE' && (
                  <button
                    onClick={handleJoinEvent}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    Join Event
                  </button>
                )}
                {isJoined && (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-green-900/30 text-green-400 border border-green-700/50">
                    ✓ Joined
                  </span>
                )}
              </div>
            </div>

            {/* Event Card */}
            <div className="mb-8">
              <div className="w-full h-80 bg-gray-800 rounded-2xl relative overflow-hidden">
                {/* Event Background Image */}
                <div className="absolute inset-0">
                  {event.imageUrl ? (
                    <Image src={event.imageUrl} alt={event.name} fill className="object-cover" />
                  ) : (
                    <Image
                      src="/event_placeholder.png"
                      alt={event.name}
                      fill
                      className="object-cover"
                    />
                  )}
                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-black/40" />
                </div>

                {/* Event Title Overlay */}
                <div className="absolute top-6 left-6 right-6 z-10">
                  <h2 className="text-white font-bold text-3xl leading-tight mb-2">{event.name}</h2>
                  {event.description && (
                    <p className="text-white/90 text-lg leading-relaxed max-w-2xl">
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Event Details Footer */}
                <div className="absolute bottom-0 left-0 right-0 bg-red-500 p-6">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3 text-white">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-lg font-medium">{formatDate(event.startDate)}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-lg font-medium">Location TBD</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white mt-3">
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(event.status)}`}
                      >
                        {event.status}
                      </span>
                      <span className="text-sm text-white/80">
                        Code: <span className="font-mono font-medium">{event.code}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Team Management - Only show for team events */}
                {event.isTeamEvent && (
                  <div>
                    <h2 className="text-white text-2xl font-bold mb-4">Team Management</h2>
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                      <div className="mb-6">
                        <p className="text-sm text-gray-400">
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
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Quick Actions */}
                <div>
                  <h2 className="text-white text-2xl font-bold mb-4">Quick Actions</h2>
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
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
                          <span className="text-sm text-green-400">
                            ✓ You&apos;re participating in this event
                          </span>
                        </div>
                      )}
                      <Link
                        href={`/events/${eventId}/leaderboard`}
                        className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                      >
                        📊 View Live Leaderboard
                      </Link>
                      <Link
                        href={`/events/${eventId}/brief`}
                        className="block w-full text-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                      >
                        View Event Brief
                      </Link>
                      <Link
                        href={`/public/leaderboard/${eventId}`}
                        className="block w-full text-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                      >
                        View Public Leaderboard
                      </Link>
                      <button
                        onClick={handleCopyEventCode}
                        className="block w-full px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                      >
                        Copy Event Code
                      </button>
                    </div>
                  </div>
                </div>

                {/* Event Stats */}
                <div>
                  <h2 className="text-white text-2xl font-bold mb-4">Event Stats</h2>
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Participants</span>
                        <span className="text-sm font-medium text-white">
                          {event.participants?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Status</span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}
                        >
                          {event.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Created</span>
                        <span className="text-sm font-medium text-white">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
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
