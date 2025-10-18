'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { beautifyRawScore } from '@/utils/scoring';
import NotificationToast from '@/components/NotificationToast';
import { useSSE } from '@/hooks/useSSE';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LargeEventCardSkeleton } from '@/components/SkeletonLoaders';

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
      scoringSystemId?: string;
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

export default function EventLeaderboard() {
  const params = useParams();
  const eventId = params.id as string;
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overall' | 'team-overall' | string>('overall');
  const [viewMode, setViewMode] = useState<'individual' | 'team'>('individual');

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

  const fetchData = useCallback(async () => {
    try {
      const [eventData, leaderboardData, activitiesData] = await Promise.all([
        api.get(`/api/events/${eventId}`),
        api.get(`/api/events/${eventId}/leaderboard`),
        api.get(`/api/events/${eventId}/activities`),
      ]);
      setEvent(eventData);
      setLeaderboardData(leaderboardData);
      setActivities(activitiesData);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

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
  }, [lastEvent, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatRawValue = (
    rawValue: number,
    activityId: string,
    reps?: number,
    scoringSystemId?: string,
  ) => {
    if (scoringSystemId) {
      return beautifyRawScore(rawValue, scoringSystemId, reps);
    }
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

  // Get available tabs based on data and view mode
  const getAvailableTabs = useCallback(() => {
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
  }, [viewMode, activities, leaderboardData?.isTeamEvent]);

  // Reset active tab when view mode changes
  useEffect(() => {
    const availableTabs = getAvailableTabs();
    if (availableTabs.length > 0 && !availableTabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [viewMode, leaderboardData, activeTab, getAvailableTabs]);

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
                <div className="h-4 bg-gray-700 rounded w-48 animate-pulse"></div>
              </div>

              {/* Event Header Skeleton */}
              <div className="mb-8">
                <div className="h-8 bg-gray-700 rounded w-80 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-700 rounded w-64 animate-pulse"></div>
              </div>

              {/* Event Card Skeleton */}
              <div className="mb-8">
                <LargeEventCardSkeleton />
              </div>

              {/* Leaderboard Skeleton */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-40 mb-4"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
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

  if (!leaderboardData || !event) {
    return (
      <ProtectedRoute>
        <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header />
          <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
            <div className="container mx-auto px-4 py-8">
              <div className="text-center py-8">
                <p className="text-gray-400">Event or leaderboard data not found.</p>
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

  const availableTabs = getAvailableTabs();

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
              <Link href={`/events/${eventId}`} className="hover:text-white transition-colors">
                {event.name}
              </Link>
              <span>/</span>
              <span className="text-white font-semibold">Leaderboard</span>
            </nav>

            {/* Event Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
              <p className="text-gray-400">
                Track your progress and see how you rank against other competitors
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/events/${eventId}/calculator`}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  🧮 Score Calculator
                </Link>
                <Link
                  href={`/public/leaderboard/${eventId}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-600 text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  📊 View Public Leaderboard
                </Link>
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
            {/* Leaderboard Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">Leaderboard</h2>

                {/* View Mode Toggle */}
                {leaderboardData.isTeamEvent && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setViewMode('individual')}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        viewMode === 'individual'
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      onClick={() => setViewMode('team')}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        viewMode === 'team'
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      Team
                    </button>
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-600 mb-6">
                <nav className="flex space-x-8 overflow-x-auto">
                  {availableTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-400'
                          : 'border-transparent text-gray-400 hover:text-white'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Leaderboard Content */}
              <div>
                {activeTab === 'overall' ? (
                  <div className="space-y-6">
                    {/* Top 3 Podium Cards */}
                    {leaderboardData.overallLeaderboard &&
                      leaderboardData.overallLeaderboard.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          {/* 2nd Place (Silver) */}
                          {leaderboardData.overallLeaderboard[1] && (
                            <div className="order-2 md:order-1 relative z-10">
                              <div className="relative bg-gray-800 rounded-2xl p-6 border-4 border-gray-400 shadow-lg">
                                {/* Rank Badge */}
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">#2</span>
                                </div>

                                {/* Avatar */}
                                <div className="flex justify-center mb-4">
                                  <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center border-2 border-gray-400 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={leaderboardData.overallLeaderboard[1].name}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>

                                {/* Name and Team */}
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-lg">
                                    {leaderboardData.overallLeaderboard[1].name}
                                  </h3>
                                  {leaderboardData.overallLeaderboard[1].teamName && (
                                    <p className="text-gray-400 text-sm">
                                      {leaderboardData.overallLeaderboard[1].teamName}
                                    </p>
                                  )}
                                </div>

                                {/* Score */}
                                <div className="text-center">
                                  <div className="text-white font-bold text-2xl">
                                    {leaderboardData.overallLeaderboard[1].totalScore?.toFixed(1) ||
                                      '0.0'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 1st Place (Gold) */}
                          {leaderboardData.overallLeaderboard[0] && (
                            <div className="order-1 md:order-2 relative z-30">
                              <div className="relative bg-gray-800 rounded-2xl p-6 border-4 border-yellow-400 shadow-xl transform scale-105">
                                {/* Rank Badge */}
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <span className="text-gray-900 font-bold text-lg">#1</span>
                                </div>

                                {/* Avatar */}
                                <div className="flex justify-center mb-4">
                                  <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-400 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={leaderboardData.overallLeaderboard[0].name}
                                      width={96}
                                      height={96}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>

                                {/* Name and Team */}
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-xl">
                                    {leaderboardData.overallLeaderboard[0].name}
                                  </h3>
                                  {leaderboardData.overallLeaderboard[0].teamName && (
                                    <p className="text-gray-400 text-sm">
                                      {leaderboardData.overallLeaderboard[0].teamName}
                                    </p>
                                  )}
                                </div>

                                {/* Score */}
                                <div className="text-center">
                                  <div className="text-white font-bold text-3xl">
                                    {leaderboardData.overallLeaderboard[0].totalScore?.toFixed(1) ||
                                      '0.0'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3rd Place (Bronze) */}
                          {leaderboardData.overallLeaderboard[2] && (
                            <div className="order-3 relative z-20">
                              <div className="relative bg-gray-800 rounded-2xl p-6 border-4 border-amber-600 shadow-lg">
                                {/* Rank Badge */}
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">#3</span>
                                </div>

                                {/* Avatar */}
                                <div className="flex justify-center mb-4">
                                  <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center border-2 border-amber-600 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={leaderboardData.overallLeaderboard[2].name}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>

                                {/* Name and Team */}
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-lg">
                                    {leaderboardData.overallLeaderboard[2].name}
                                  </h3>
                                  {leaderboardData.overallLeaderboard[2].teamName && (
                                    <p className="text-gray-400 text-sm">
                                      {leaderboardData.overallLeaderboard[2].teamName}
                                    </p>
                                  )}
                                </div>

                                {/* Score */}
                                <div className="text-center">
                                  <div className="text-white font-bold text-2xl">
                                    {leaderboardData.overallLeaderboard[2].totalScore?.toFixed(1) ||
                                      '0.0'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Full Leaderboard Table */}
                    {leaderboardData.overallLeaderboard &&
                      leaderboardData.overallLeaderboard.length > 0 && (
                        <div>
                          <h3 className="text-white text-lg font-semibold mb-4">
                            Full Leaderboard
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-600">
                              <thead className="bg-gray-700">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Rank
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Competitor
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Total Score
                                  </th>
                                  {activities.map((activity) => (
                                    <th
                                      key={activity.id}
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                    >
                                      {activity.name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-gray-800 divide-y divide-gray-600">
                                {leaderboardData.overallLeaderboard.map((entry) => (
                                  <tr key={entry.userId} className="hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <span className="text-lg mr-2">
                                          {getRankIcon(entry.rank)}
                                        </span>
                                        <span className="text-sm font-medium text-white">
                                          {entry.rank}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div>
                                        <div className="text-sm font-medium text-white">
                                          {entry.name}
                                        </div>

                                        {entry.teamId && entry.teamName && (
                                          <div className="text-xs text-gray-400">
                                            Team: {entry.teamName}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-bold text-white">
                                        {entry.totalScore ? entry.totalScore.toFixed(1) : '0.0'}
                                      </div>
                                    </td>
                                    {activities.map((activity) => {
                                      const workoutScore = entry.workoutScores[activity.id];
                                      return (
                                        <td
                                          key={activity.id}
                                          className="px-6 py-4 whitespace-nowrap"
                                        >
                                          {workoutScore ? (
                                            <div className="text-sm">
                                              <div className="font-medium text-white">
                                                {workoutScore.score
                                                  ? workoutScore.score.toFixed(1)
                                                  : '0.0'}
                                              </div>
                                              <div className="text-xs text-gray-400">
                                                {workoutScore.rawValue
                                                  ? (workoutScore as { scoringSystemId?: string })
                                                      .scoringSystemId
                                                    ? formatRawValue(
                                                        workoutScore.rawValue,
                                                        activity.id,
                                                        workoutScore.reps,
                                                        (
                                                          workoutScore as {
                                                            scoringSystemId?: string;
                                                          }
                                                        ).scoringSystemId,
                                                      )
                                                    : formatRawValue(
                                                        workoutScore.rawValue,
                                                        activity.id,
                                                        workoutScore.reps,
                                                      )
                                                  : ''}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Rank: {workoutScore.rank}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-sm text-gray-500">-</div>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                  </div>
                ) : activeTab === 'team-overall' ? (
                  <div className="space-y-6">
                    {/* Top 3 Team Podium Cards */}
                    {leaderboardData.teamOverallLeaderboard &&
                      leaderboardData.teamOverallLeaderboard.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          {/* 2nd Place Team (Silver) */}
                          {leaderboardData.teamOverallLeaderboard[1] && (
                            <div className="order-2 md:order-1 relative z-10">
                              <div className="relative bg-gray-800 rounded-2xl p-6 border-4 border-gray-400 shadow-lg">
                                {/* Rank Badge */}
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">#2</span>
                                </div>

                                {/* Team Avatar */}
                                <div className="flex justify-center mb-4">
                                  <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center border-2 border-gray-400 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={leaderboardData.teamOverallLeaderboard[1].teamName}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>

                                {/* Team Name */}
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-lg">
                                    {leaderboardData.teamOverallLeaderboard[1].teamName}
                                  </h3>
                                  <p className="text-gray-400 text-sm">Team</p>
                                </div>

                                {/* Score */}
                                <div className="text-center">
                                  <div className="text-white font-bold text-2xl">
                                    {leaderboardData.teamOverallLeaderboard[1].totalScore?.toFixed(
                                      1,
                                    ) || '0.0'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 1st Place Team (Gold) */}
                          {leaderboardData.teamOverallLeaderboard[0] && (
                            <div className="order-1 md:order-2 relative z-30">
                              <div className="relative bg-gray-800 rounded-2xl p-6 border-4 border-yellow-400 shadow-xl transform scale-105">
                                {/* Rank Badge */}
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <span className="text-gray-900 font-bold text-lg">#1</span>
                                </div>

                                {/* Team Avatar */}
                                <div className="flex justify-center mb-4">
                                  <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-400 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={leaderboardData.teamOverallLeaderboard[0].teamName}
                                      width={96}
                                      height={96}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>

                                {/* Team Name */}
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-xl">
                                    {leaderboardData.teamOverallLeaderboard[0].teamName}
                                  </h3>
                                  <p className="text-gray-400 text-sm">Team</p>
                                </div>

                                {/* Score */}
                                <div className="text-center">
                                  <div className="text-white font-bold text-3xl">
                                    {leaderboardData.teamOverallLeaderboard[0].totalScore?.toFixed(
                                      1,
                                    ) || '0.0'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3rd Place Team (Bronze) */}
                          {leaderboardData.teamOverallLeaderboard[2] && (
                            <div className="order-3 relative z-20">
                              <div className="relative bg-gray-800 rounded-2xl p-6 border-4 border-amber-600 shadow-lg">
                                {/* Rank Badge */}
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">#3</span>
                                </div>

                                {/* Team Avatar */}
                                <div className="flex justify-center mb-4">
                                  <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center border-2 border-amber-600 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={leaderboardData.teamOverallLeaderboard[2].teamName}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>

                                {/* Team Name */}
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-lg">
                                    {leaderboardData.teamOverallLeaderboard[2].teamName}
                                  </h3>
                                  <p className="text-gray-400 text-sm">Team</p>
                                </div>

                                {/* Score */}
                                <div className="text-center">
                                  <div className="text-white font-bold text-2xl">
                                    {leaderboardData.teamOverallLeaderboard[2].totalScore?.toFixed(
                                      1,
                                    ) || '0.0'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Full Team Leaderboard */}
                    {leaderboardData.teamOverallLeaderboard &&
                      leaderboardData.teamOverallLeaderboard.length > 0 && (
                        <div>
                          <h3 className="text-white text-lg font-semibold mb-4">
                            Full Team Leaderboard
                          </h3>
                          <div className="space-y-4">
                            {leaderboardData.teamOverallLeaderboard.map((entry) => (
                              <div
                                key={entry.teamId}
                                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                              >
                                <div className="flex items-center space-x-4">
                                  <div className="text-2xl">{getRankIcon(entry.rank)}</div>
                                  <div>
                                    <div className="font-medium text-white">{entry.teamName}</div>
                                    <div className="text-sm text-gray-400">
                                      Team Total Score: {entry.totalScore.toFixed(1)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-white">
                                    {entry.totalScore.toFixed(1)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* No teams message */}
                    {(!leaderboardData.teamOverallLeaderboard ||
                      leaderboardData.teamOverallLeaderboard.length === 0) && (
                      <div className="text-center py-8 text-gray-400">
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
                              className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="text-2xl">{getRankIcon(entry.rank)}</div>
                                <div>
                                  <div className="font-medium text-white">{entry.name}</div>
                                  <div className="text-sm text-gray-400">
                                    {entry.rawValue
                                      ? (entry as { scoringSystemId?: string }).scoringSystemId
                                        ? formatRawValue(
                                            entry.rawValue,
                                            activeTab,
                                            entry.reps,
                                            (entry as { scoringSystemId?: string }).scoringSystemId,
                                          )
                                        : formatRawValue(entry.rawValue, activeTab, entry.reps)
                                      : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-white">
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
                              className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="text-2xl">{getRankIcon(entry.rank)}</div>
                                <div>
                                  <div className="font-medium text-white">{entry.teamName}</div>
                                  <div className="text-sm text-gray-400">Team Score</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-white">
                                  {entry.score.toFixed(1) || '0.0'}
                                </div>
                              </div>
                            </div>
                          )) || (
                          <div className="text-center py-8 text-gray-400">
                            No scores available for this activity yet.
                          </div>
                        )}
                  </div>
                )}
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
