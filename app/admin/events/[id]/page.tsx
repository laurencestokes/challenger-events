'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../lib/api-client';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AddWorkoutModal from '@/components/AddWorkoutModal';
import EditWorkoutModal from '@/components/EditWorkoutModal';
import ConfirmModal from '@/components/ConfirmModal';
import Leaderboard from '@/components/Leaderboard';
import ScoreSubmissionModal from '@/components/ScoreSubmissionModal';

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
  const [leaderboardKey, setLeaderboardKey] = useState(0);

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
      await api.post(`/api/events/${eventId}/activities/${activityId}/reveal`);
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

              {/* Workouts */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
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

              {/* Leaderboard */}
              <Leaderboard key={leaderboardKey} eventId={eventId} />
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
            // Refresh the leaderboard by changing the key
            setLeaderboardKey((prev) => prev + 1);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
