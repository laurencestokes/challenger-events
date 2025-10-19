'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../lib/api-client';
import Link from 'next/link';
import Image from 'next/image';
import ProtectedRoute from '@/components/ProtectedRoute';
import AddWorkoutModal from '@/components/AddWorkoutModal';
import EditWorkoutModal from '@/components/EditWorkoutModal';
import ConfirmModal from '@/components/ConfirmModal';
import ScoreSubmissionModal from '@/components/ScoreSubmissionModal';
import WelcomeSection from '@/components/WelcomeSection';
import {
  LargeEventCardSkeleton,
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
}

interface Activity {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  scoringSystemId?: string;
  unit?: string;
  order: number;
  isHidden?: boolean;
  revealedAt?: Date;
  createdAt: Date;
}

interface ScoringSystem {
  id: string;
  name: string;
  description: string;
  category: 'STRENGTH' | 'ENDURANCE' | 'MIXED';
  inputType: 'WEIGHT' | 'TIME' | 'DISTANCE' | 'REPS' | 'CUSTOM';
  unit?: string;
  requiresBodyweight: boolean;
  requiresAge: boolean;
  requiresSex: boolean;
  calculationFunction: string;
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [scoringSystems, setScoringSystems] = useState<ScoringSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddWorkoutModal, setShowAddWorkoutModal] = useState(false);
  const [showEditWorkoutModal, setShowEditWorkoutModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showScoreSubmissionModal, setShowScoreSubmissionModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const eventId = params.id as string;

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const [eventData, activitiesData, scoringSystemsData] = await Promise.all([
          api.get(`/api/events/${eventId}`),
          api.get(`/api/events/${eventId}/activities`),
          api.get('/api/scoring-systems'),
        ]);

        setEvent(eventData);
        setActivities(activitiesData);
        setScoringSystems(scoringSystemsData);
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

  const handleRevealWorkout = async (activityId: string) => {
    try {
      await api.post(`/api/events/${eventId}/activities/${activityId}/reveal`, {});
      // Update the activity in the local state
      setActivities(
        activities.map((activity) =>
          activity.id === activityId
            ? { ...activity, isHidden: false, revealedAt: new Date() }
            : activity,
        ),
      );
    } catch (error: unknown) {
      console.error('Error revealing workout:', error);
      setError('Failed to reveal workout');
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            {/* Welcome Section Skeleton */}
            <div className="flex items-center mb-8">
              <div className="w-16 h-16 bg-gray-700 rounded-full animate-pulse mr-4"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-6 bg-gray-700 rounded w-32 animate-pulse"></div>
              </div>
            </div>

            {/* Header Skeleton */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-12 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-gray-700 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="flex items-center space-x-3">
                    <div className="h-6 bg-gray-700 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-8 bg-gray-700 rounded w-24 animate-pulse"></div>
                  <div className="h-8 bg-gray-700 rounded w-20 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Event Card Skeleton */}
            <div className="mb-8">
              <LargeEventCardSkeleton />
            </div>

            {/* Main Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Event Info Skeleton */}
              <div className="lg:col-span-2 space-y-6">
                {/* Participants Skeleton */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 bg-gray-700 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-16 bg-gray-700 rounded-lg animate-pulse"></div>
                    <div className="h-16 bg-gray-700 rounded-lg animate-pulse"></div>
                  </div>
                </div>

                {/* Workouts Skeleton */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 bg-gray-700 rounded w-16 animate-pulse"></div>
                    <div className="h-8 bg-gray-700 rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-20 bg-gray-700 rounded-lg animate-pulse"></div>
                    <div className="h-20 bg-gray-700 rounded-lg animate-pulse"></div>
                  </div>
                </div>

                {/* Leaderboard Skeleton */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                  <div className="h-6 bg-gray-700 rounded w-20 mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Sidebar Skeleton */}
              <div className="space-y-6">
                <QuickActionsSkeleton />
                <EventStatsSkeleton />
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
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
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-8">
              <p className="text-gray-400">Event not found.</p>
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
              <div className="flex flex-wrap items-center gap-2">
                {event.status === 'DRAFT' && (
                  <button
                    onClick={handlePublishEvent}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-success-600 hover:bg-success-700 transition-colors"
                  >
                    Publish Event
                  </button>
                )}
                {event.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => setShowScoreSubmissionModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                    >
                      Submit Score
                    </button>
                    <button
                      onClick={handleCancelEvent}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-error-600 hover:bg-error-700 transition-colors"
                    >
                      Cancel Event
                    </button>
                  </>
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
              {/* Event Card */}
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

              {/* Participants */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
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

              {/* Workouts */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Workouts</h2>
                  <button
                    onClick={() => setShowAddWorkoutModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    Add Workout
                  </button>
                </div>
                {activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity) => {
                      const scoringSystem = scoringSystems.find(
                        (sys) => sys.id === activity.scoringSystemId,
                      );
                      return (
                        <div
                          key={activity.id}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            activity.isHidden
                              ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {activity.name}
                              </h3>
                              {activity.isHidden && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                  Hidden
                                </span>
                              )}
                              {activity.revealedAt && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Revealed
                                </span>
                              )}
                            </div>
                            {activity.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {activity.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Type: {activity.type}
                              </span>
                              {activity.unit && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Unit: {activity.unit}
                                </span>
                              )}
                              {scoringSystem && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Scoring: {scoringSystem.name}
                                </span>
                              )}
                            </div>
                            {activity.isHidden && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                ⚠️ This workout is hidden from competitors
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {activity.isHidden && (
                              <button
                                onClick={() => handleRevealWorkout(activity.id)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 text-sm"
                              >
                                Reveal
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedActivity(activity);
                                setShowEditWorkoutModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedActivity(activity);
                                setShowDeleteConfirmModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No workouts added yet.</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Add workouts to define the exercises and scoring systems for this event.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link
                    href={`/events/${eventId}/leaderboard`}
                    className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    📊 View Live Leaderboard
                  </Link>
                  <Link
                    href={`/events/${eventId}/brief`}
                    className="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    View Event Brief
                  </Link>
                  <Link
                    href={`/admin/events/${eventId}/brief`}
                    className="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Edit Event Brief
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
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Event Stats</h2>
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

        {/* Add Workout Modal */}
        {showAddWorkoutModal && (
          <AddWorkoutModal
            eventId={eventId}
            onClose={() => setShowAddWorkoutModal(false)}
            onWorkoutAdded={(newActivity) => {
              setActivities([...activities, newActivity]);
              setShowAddWorkoutModal(false);
            }}
          />
        )}

        {/* Edit Workout Modal */}
        {showEditWorkoutModal && selectedActivity && (
          <EditWorkoutModal
            activity={selectedActivity}
            eventId={eventId}
            onClose={() => {
              setShowEditWorkoutModal(false);
              setSelectedActivity(null);
            }}
            onWorkoutUpdated={(updatedActivity) => {
              setActivities(
                activities.map((a) => (a.id === updatedActivity.id ? updatedActivity : a)),
              );
              setShowEditWorkoutModal(false);
              setSelectedActivity(null);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirmModal}
          title="Delete Workout"
          message={`Are you sure you want to delete "${selectedActivity?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isDestructive={true}
          onConfirm={async () => {
            if (selectedActivity) {
              try {
                await api.delete(`/api/events/${eventId}/activities/${selectedActivity.id}`);
                setActivities(activities.filter((a) => a.id !== selectedActivity.id));
                setShowDeleteConfirmModal(false);
                setSelectedActivity(null);
              } catch (error) {
                console.error('Error deleting activity:', error);
                setError('Failed to delete workout');
                setShowDeleteConfirmModal(false);
                setSelectedActivity(null);
              }
            }
          }}
          onCancel={() => {
            setShowDeleteConfirmModal(false);
            setSelectedActivity(null);
          }}
        />

        {/* Score Submission Modal */}
        <ScoreSubmissionModal
          eventId={eventId}
          isOpen={showScoreSubmissionModal}
          onClose={() => setShowScoreSubmissionModal(false)}
          onScoreSubmitted={() => {
            // Score submitted successfully
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
