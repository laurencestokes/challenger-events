'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { beautifyRawScore } from '@/utils/scoring';
import ScoreCalculator from '@/components/ScoreCalculator';
import NotificationToast from '@/components/NotificationToast';
import { useSSE } from '@/hooks/useSSE';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Activity {
  id: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  unit?: string;
  scoringSystemId?: string;
  reps?: number;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  totalScore: number;
  workoutScores: {
    [activityId: string]: {
      score: number;
      rawValue: number;
      reps?: number;
      rank: number;
      activityName: string;
    };
  };
  rank: number;
  teamId?: string;
  teamName?: string;
}

interface WorkoutLeaderboard {
  activityId: string;
  activityName: string;
  entries: {
    userId: string;
    name: string;
    email: string;
    score: number;
    rawValue: number;
    reps?: number;
    rank: number;
    teamId?: string;
    teamName?: string;
  }[];
}

interface LeaderboardData {
  eventId: string;
  eventName: string;
  isTeamEvent: boolean;
  teamScoringMethod?: 'SUM' | 'AVERAGE' | 'BEST';
  overallLeaderboard: LeaderboardEntry[];
  workoutLeaderboards: WorkoutLeaderboard[];
  teamOverallLeaderboard?: TeamLeaderboardEntry[];
  teamWorkoutLeaderboards?: TeamWorkoutLeaderboard[];
}

interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  totalScore: number;
  workoutScores: {
    [activityId: string]: {
      score: number;
      rawValue: number;
      rank: number;
      activityName: string;
    };
  };
  rank: number;
}

interface TeamWorkoutLeaderboard {
  activityId: string;
  activityName: string;
  entries: {
    teamId: string;
    teamName: string;
    score: number;
    rank: number;
  }[];
}

interface CompetitionVerification {
  userId: string;
  eventId: string;
  bodyweight: number;
  status: string;
  verifiedAt?: string | Date;
  verificationNotes?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: 'M' | 'F';
}

export default function EventLeaderboard() {
  const params = useParams();
  const eventId = params.id as string;
  const { user } = useAuth();

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overall' | 'team-overall' | string>('overall');
  const [viewMode, setViewMode] = useState<'individual' | 'team'>('individual');
  const [competitionVerification, setCompetitionVerification] =
    useState<CompetitionVerification | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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

      // Refresh activities to show the newly revealed workout
      fetchData();
    }
  }, [lastEvent]);

  const fetchData = async () => {
    try {
      const [leaderboardData, activitiesData] = await Promise.all([
        api.get(`/api/events/${eventId}/leaderboard`),
        api.get(`/api/events/${eventId}/activities`),
      ]);
      setLeaderboardData(leaderboardData);
      setActivities(activitiesData);
      // Fetch user profile and competition verification if user is logged in
      if (user) {
        const [profile, verification] = await Promise.all([
          api.get('/api/user/profile'),
          api.get(`/api/events/${eventId}/competition-verification`),
        ]);
        setUserProfile(profile);
        // Find this user's verification
        if (verification && Array.isArray(verification.verifications)) {
          const myVerification = verification.verifications.find(
            (v: CompetitionVerification) => v.userId === user.id && v.status === 'VERIFIED',
          );
          setCompetitionVerification(myVerification || null);
        } else {
          setCompetitionVerification(null);
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, user]);

  const getActivityUnit = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    return activity?.unit || '';
  };

  const formatRawValue = (rawValue: number, activityId: string, reps?: number) => {
    return beautifyRawScore(rawValue, activityId, reps);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return rank.toString();
    }
  };

  // Get available tabs based on data and view mode
  const getAvailableTabs = () => {
    const tabs: Array<{ id: string; name: string; type: 'overall' | 'team-overall' | string }> = [];

    if (viewMode === 'individual') {
      tabs.push({ id: 'overall', name: 'Overall', type: 'overall' });
      activities.forEach((activity) => {
        tabs.push({ id: activity.id, name: activity.name, type: activity.id });
      });
    } else if (viewMode === 'team' && leaderboardData?.isTeamEvent) {
      tabs.push({ id: 'team-overall', name: 'Team Overall', type: 'team-overall' });
      activities.forEach((activity) => {
        tabs.push({ id: activity.id, name: activity.name, type: activity.id });
      });
    }

    return tabs;
  };

  // Reset active tab when view mode changes
  useEffect(() => {
    const availableTabs = getAvailableTabs();
    if (availableTabs.length > 0 && !availableTabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [viewMode, leaderboardData, activeTab, getAvailableTabs]);

  // Determine which bodyweight to use for calculations
  const bodyweightForScoring = competitionVerification?.bodyweight || userProfile?.bodyweight || 70;
  const sexForScoring = userProfile?.sex || 'M';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!leaderboardData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            No leaderboard data available
          </div>
        </div>
      </div>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Link
              href="/dashboard"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
            >
              Dashboard
            </Link>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <Link
              href={`/events/${eventId}`}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
            >
              {leaderboardData?.eventName || 'Event'}
            </Link>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-900 dark:text-white text-sm font-medium">Leaderboard</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {leaderboardData?.eventName || 'Event'} Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your progress and calculate target scores
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leaderboard Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Leaderboard
                  </h2>

                  {/* View Mode Toggle */}
                  {leaderboardData.isTeamEvent && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewMode('individual')}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${
                          viewMode === 'individual'
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Individual
                      </button>
                      <button
                        onClick={() => setViewMode('team')}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${
                          viewMode === 'team'
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Team
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6 overflow-x-auto">
                  {availableTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Leaderboard Content */}
              <div className="p-6">
                {activeTab === 'overall' ? (
                  <div className="space-y-4">
                    {leaderboardData.overallLeaderboard?.map((entry) => (
                      <div
                        key={entry.userId}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{getRankIcon(entry.rank)}</div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {entry.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Total Score: {entry.totalScore.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {entry.totalScore.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No overall scores available yet.
                      </div>
                    )}
                  </div>
                ) : activeTab === 'team-overall' ? (
                  <div className="space-y-4">
                    {leaderboardData.teamOverallLeaderboard?.map((entry) => (
                      <div
                        key={entry.teamId}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{getRankIcon(entry.rank)}</div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {entry.teamName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Team Total Score: {entry.totalScore.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {entry.totalScore.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No team overall scores available yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {viewMode === 'individual'
                      ? // Individual activity leaderboard
                        leaderboardData.workoutLeaderboards
                          ?.find((workout) => workout.activityId === activeTab)
                          ?.entries?.map((entry) => (
                            <div
                              key={entry.userId}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="text-2xl">{getRankIcon(entry.rank)}</div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {entry.name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatRawValue(
                                      entry.rawValue || 0,
                                      getActivityUnit(activeTab),
                                      entry.reps,
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {entry.score.toFixed(1) || '0.0'}
                                </div>
                              </div>
                            </div>
                          ))
                      : // Team activity leaderboard
                        leaderboardData.teamWorkoutLeaderboards
                          ?.find((workout) => workout.activityId === activeTab)
                          ?.entries?.map((entry) => (
                            <div
                              key={entry.teamId}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="text-2xl">{getRankIcon(entry.rank)}</div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {entry.teamName}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Team Score
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {entry.score.toFixed(1) || '0.0'}
                                </div>
                              </div>
                            </div>
                          )) || (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No scores available for this activity yet.
                          </div>
                        )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Score Calculator Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Score Calculator
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Calculate your target scores for each event
                </p>
              </div>
              <div className="p-6">
                <ScoreCalculator
                  activities={activities}
                  userProfileOverride={{
                    bodyweight: bodyweightForScoring,
                    dateOfBirth: userProfile?.dateOfBirth,
                    sex: sexForScoring,
                    competitionVerification,
                    profileBodyweight: userProfile?.bodyweight,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
