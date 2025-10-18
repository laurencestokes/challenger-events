'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { beautifyRawScore } from '@/utils/scoring';
import NotificationToast from '@/components/NotificationToast';
import { useSSEUnauth } from '@/hooks/useSSEUnauth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

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
    scoringSystemId?: string;
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
    rawValue: number;
    reps?: number;
    rank: number;
  }[];
}

interface EventDetails {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  isTeamEvent: boolean;
  teamScoringMethod?: 'SUM' | 'AVERAGE' | 'BEST';
  maxTeamSize?: number;
}

export default function PublicEventLeaderboard() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [eventInfo, setEventInfo] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overall' | 'team-overall' | string>('overall');
  const [viewMode, setViewMode] = useState<'individual' | 'team'>('individual');

  // SSE and notification state
  const { isConnected, lastEvent } = useSSEUnauth(eventId);
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
      const [leaderboardData, activitiesData, eventData] = await Promise.all([
        fetch(`/api/public/leaderboard/${eventId}`).then((res) => {
          if (!res.ok) {
            throw new Error('Failed to fetch leaderboard data');
          }
          return res.json();
        }),
        fetch(`/api/public/events/${eventId}/activities`).then((res) => {
          if (!res.ok) {
            throw new Error('Failed to fetch activities data');
          }
          return res.json();
        }),
        fetch(`/api/public/events/${eventId}`).then((res) => {
          if (!res.ok) {
            return null;
          }
          return res.json();
        }),
      ]);
      setLeaderboardData(leaderboardData);
      setActivities(activitiesData);

      // Set event details and info if available
      if (eventData) {
        setEventDetails(eventData);
        if (eventData.description) {
          setEventInfo(eventData.description);
        }
      }
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
  }, [eventId, fetchData]);

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
        return `#${rank}`;
    }
  };

  const getAvailableTabs = useCallback(() => {
    const tabs = [
      { id: 'overall', name: 'Overall' },
      ...(leaderboardData?.workoutLeaderboards?.map((workout) => ({
        id: workout.activityId,
        name: workout.activityName,
      })) || []),
    ];

    return tabs;
  }, [leaderboardData?.workoutLeaderboards]);

  const formatDate = (date: unknown) => {
    if (!date) return 'TBD';
    try {
      const d = new Date(date as string | number | Date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'TBD';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
        <div className="max-w-7xl mx-auto py-12 px-4">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600 dark:text-gray-400 animate-pulse">
              Loading leaderboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
        <div className="max-w-7xl mx-auto py-12 px-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Error Loading Leaderboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!leaderboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
        <div className="max-w-7xl mx-auto py-12 px-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              No Leaderboard Data
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              No leaderboard data is available for this event.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = getAvailableTabs();

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col"
      style={{ backgroundColor: '#0F0F0F' }}
    >
      {/* Connection Status */}
      <div className="fixed bottom-4 left-4 z-40">
        <div
          className={`px-3 py-1 rounded-full text-xs ${
            isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {isConnected ? '🟢 Live' : '🔴 Offline'}
        </div>
      </div>

      {/* QR Code - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-gray-800/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-700/50">
          <div className="text-center mb-2">
            <p className="text-xs text-gray-300 mb-1">Share</p>
          </div>
          <QRCodeSVG
            value={typeof window !== 'undefined' ? window.location.href : ''}
            size={80}
            level="M"
            includeMargin={true}
            className="mx-auto"
          />
        </div>
      </div>

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Challenger Branding */}
            <div className="flex items-center justify-center space-x-3 mb-8">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/challengerco-logo-text-only.png"
                  alt="The Challenger Co."
                  width={120}
                  height={48}
                  className="h-8 w-auto"
                  priority
                />
                <span className="px-3 py-1 text-xs font-bold bg-gradient-athletic text-white rounded-full shadow-challenger font-display">
                  BETA
                </span>
              </a>
            </div>

            {/* Event Information Card */}
            {eventDetails && (
              <div className="mt-6">
                <div className="w-full h-80 bg-gray-800 rounded-2xl relative overflow-hidden">
                  {/* Event Background Image */}
                  <div className="absolute inset-0">
                    <Image
                      src="/event_placeholder.png"
                      alt={eventDetails.name}
                      fill
                      className="object-cover"
                    />
                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-black/40" />
                  </div>

                  {/* Event Title and Description Overlay */}
                  <div className="absolute top-6 left-6 right-6 z-10">
                    <h1 className="text-white font-bold text-3xl mb-2 font-display text-left">
                      {leaderboardData.eventName}
                    </h1>
                    {eventInfo && <p className="text-white/90 text-xl text-left">{eventInfo}</p>}
                  </div>

                  {/* Event Details Footer */}
                  <div
                    className="absolute bottom-0 left-0 right-0 p-6"
                    style={{ backgroundColor: '#4682b4' }}
                  >
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-3 text-white">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-lg font-medium">
                          {formatDate(eventDetails.startDate)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-white mt-3">
                        <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                          {eventDetails.status}
                        </span>
                        <span className="text-sm text-white/80">
                          Type:{' '}
                          <span className="font-medium">
                            {eventDetails.isTeamEvent ? 'Team' : 'Individual'}
                          </span>
                        </span>
                        {eventDetails.isTeamEvent && eventDetails.teamScoringMethod && (
                          <span className="text-sm text-white/80">
                            Scoring:{' '}
                            <span className="font-medium">{eventDetails.teamScoringMethod}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          {leaderboardData.isTeamEvent && (
            <div className="flex justify-center mb-6">
              <button
                onClick={() => setViewMode('individual')}
                className={`px-3 py-1 text-sm font-medium rounded-md mr-4 ${
                  viewMode === 'individual'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600'
                }`}
                style={viewMode === 'individual' ? { backgroundColor: '#4682b4' } : {}}
              >
                Individual
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  viewMode === 'team'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600'
                }`}
                style={viewMode === 'team' ? { backgroundColor: '#4682b4' } : {}}
              >
                Team
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg mb-6 border border-gray-700/50">
            <div className="border-b border-gray-700/50">
              <nav className="flex space-x-8 overflow-x-auto px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-400'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === 'overall' && (
                <div className="space-y-6">
                  {/* Top 3 Podium Cards */}
                  {viewMode === 'team' &&
                  leaderboardData.teamOverallLeaderboard &&
                  leaderboardData.teamOverallLeaderboard.length > 0 ? (
                    // Team Podium
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
                                {leaderboardData.teamOverallLeaderboard[1].totalScore?.toFixed(1) ||
                                  '0.0'}
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
                                {leaderboardData.teamOverallLeaderboard[0].totalScore?.toFixed(1) ||
                                  '0.0'}
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
                                {leaderboardData.teamOverallLeaderboard[2].totalScore?.toFixed(1) ||
                                  '0.0'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : leaderboardData.overallLeaderboard &&
                    leaderboardData.overallLeaderboard.length > 0 ? (
                    // Individual Podium
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
                  ) : null}

                  {/* Full Leaderboard Table */}
                  {leaderboardData.overallLeaderboard &&
                    leaderboardData.overallLeaderboard.length > 0 && (
                      <div>
                        <h3 className="text-white text-lg font-semibold mb-4">Full Leaderboard</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-600">
                            <thead className="bg-gray-700">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  Rank
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  {viewMode === 'team' ? 'Team' : 'Competitor'}
                                </th>
                                {activities.map((activity) => (
                                  <th
                                    key={activity.id}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                  >
                                    {activity.name}
                                  </th>
                                ))}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-600">
                              {viewMode === 'team'
                                ? (() => {
                                    // Get all team members for each team to show individual scores
                                    const teamMembers =
                                      leaderboardData.overallLeaderboard?.filter(
                                        (entry) => entry.teamId,
                                      ) || [];
                                    const teams = new Map<
                                      string,
                                      {
                                        teamId: string;
                                        teamName: string;
                                        totalScore: number;
                                        members: typeof teamMembers;
                                      }
                                    >();

                                    // Group members by team
                                    teamMembers.forEach((member) => {
                                      if (!member.teamId || !member.teamName) return;

                                      if (!teams.has(member.teamId)) {
                                        teams.set(member.teamId, {
                                          teamId: member.teamId,
                                          teamName: member.teamName,
                                          totalScore: 0,
                                          members: [],
                                        });
                                      }

                                      const team = teams.get(member.teamId)!;
                                      team.members.push(member);
                                      team.totalScore += member.totalScore;
                                    });

                                    // Convert to array and sort by total score
                                    return Array.from(teams.values())
                                      .sort((a, b) => b.totalScore - a.totalScore)
                                      .map((team, index) => (
                                        <tr key={team.teamId} className="hover:bg-gray-700">
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                              <span className="text-lg font-semibold text-white">
                                                {getRankIcon(index + 1)}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                              <div>
                                                <div className="text-sm font-medium text-white">
                                                  {team.teamName}
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          {activities.map((activity) => {
                                            // Get all scores for this activity from team members
                                            const memberScores = team.members
                                              .map((member) => member.workoutScores[activity.id])
                                              .filter((score) => score)
                                              .sort((a, b) => (b?.score || 0) - (a?.score || 0));

                                            if (memberScores.length === 0) {
                                              return (
                                                <td
                                                  key={activity.id}
                                                  className="px-6 py-4 whitespace-nowrap"
                                                >
                                                  <div className="text-sm text-gray-500">-</div>
                                                </td>
                                              );
                                            }

                                            // Show best score and individual performances
                                            const bestScore = memberScores[0];
                                            return (
                                              <td
                                                key={activity.id}
                                                className="px-6 py-4 whitespace-nowrap"
                                              >
                                                <div className="text-sm">
                                                  <div className="font-medium text-white">
                                                    {bestScore.score.toFixed(1)}
                                                  </div>
                                                  <div className="space-y-1 mt-1">
                                                    {memberScores.slice(0, 3).map((score, idx) => {
                                                      // Find the team member who achieved this score
                                                      const member = team.members.find(
                                                        (m) =>
                                                          m.workoutScores[activity.id]?.score ===
                                                            score.score &&
                                                          m.workoutScores[activity.id]?.rawValue ===
                                                            score.rawValue,
                                                      );
                                                      return (
                                                        <div
                                                          key={idx}
                                                          className="text-xs text-gray-400"
                                                        >
                                                          <span className="font-medium">
                                                            {member?.name || 'Unknown'}
                                                          </span>
                                                          {' - '}
                                                          {score.rawValue
                                                            ? formatRawValue(
                                                                score.rawValue,
                                                                activity.id,
                                                                score.reps,
                                                                score.scoringSystemId,
                                                              )
                                                            : ''}
                                                        </div>
                                                      );
                                                    })}
                                                    {memberScores.length > 3 && (
                                                      <div className="text-xs text-gray-500">
                                                        +{memberScores.length - 3} more
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </td>
                                            );
                                          })}
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-white">
                                              {team.totalScore.toFixed(1)}
                                            </div>
                                          </td>
                                        </tr>
                                      ));
                                  })()
                                : leaderboardData.overallLeaderboard?.map((entry) => (
                                    <tr key={entry.userId} className="hover:bg-gray-700">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <span className="text-lg font-semibold text-white">
                                            {getRankIcon(entry.rank)}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
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
                                              </div>
                                            ) : (
                                              <div className="text-sm text-gray-500">-</div>
                                            )}
                                          </td>
                                        );
                                      })}
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-white">
                                          {entry.totalScore.toFixed(1)}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Individual Activity Leaderboards */}
              {activeTab !== 'overall' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {activities.find((a) => a.id === activeTab)?.name} Leaderboard
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            {viewMode === 'team' ? 'Team' : 'Competitor'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Performance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-600">
                        {viewMode === 'team'
                          ? (() => {
                              const workoutEntries =
                                leaderboardData.workoutLeaderboards
                                  ?.find((workout) => workout.activityId === activeTab)
                                  ?.entries.filter((entry) => entry.teamId) || [];

                              // Group by team and sort by best score within each team
                              const groupedByTeam = workoutEntries.reduce(
                                (acc, entry) => {
                                  const teamKey = entry.teamId || 'unknown';
                                  if (!acc[teamKey]) {
                                    acc[teamKey] = {
                                      teamId: entry.teamId,
                                      teamName: entry.teamName,
                                      members: [],
                                    };
                                  }

                                  // Find if member already exists
                                  const existingMember = acc[teamKey].members.find(
                                    (m) => m.userId === entry.userId,
                                  );
                                  if (existingMember) {
                                    existingMember.performances.push({
                                      score: entry.score,
                                      rawValue: entry.rawValue,
                                      reps: entry.reps,
                                      rank: entry.rank,
                                    });
                                  } else {
                                    acc[teamKey].members.push({
                                      userId: entry.userId,
                                      name: entry.name,
                                      performances: [
                                        {
                                          score: entry.score,
                                          rawValue: entry.rawValue,
                                          reps: entry.reps,
                                          rank: entry.rank,
                                        },
                                      ],
                                    });
                                  }
                                  return acc;
                                },
                                {} as Record<
                                  string,
                                  {
                                    teamId?: string;
                                    teamName?: string;
                                    members: Array<{
                                      userId: string;
                                      name: string;
                                      performances: Array<{
                                        score: number;
                                        rawValue: number;
                                        reps?: number;
                                        rank: number;
                                      }>;
                                    }>;
                                  }
                                >,
                              );

                              // Convert to array and sort by best team score
                              return Object.values(groupedByTeam)
                                .map((team) => {
                                  // Calculate team total score (sum of best scores)
                                  const teamTotalScore = team.members.reduce((total, member) => {
                                    const bestScore = Math.max(
                                      ...member.performances.map((p) => p.score),
                                    );
                                    return total + bestScore;
                                  }, 0);

                                  return {
                                    ...team,
                                    totalScore: teamTotalScore,
                                  };
                                })
                                .sort((a, b) => b.totalScore - a.totalScore)
                                .map((team, index) => (
                                  <tr key={team.teamId} className="hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <span className="text-lg font-semibold text-white">
                                          {getRankIcon(index + 1)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div>
                                          <div className="text-sm font-medium text-white">
                                            {team.teamName}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-white">
                                        {team.totalScore.toFixed(1)}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="space-y-2">
                                        {team.members
                                          .sort((a, b) => {
                                            const aBestScore = Math.max(
                                              ...a.performances.map((p) => p.score),
                                            );
                                            const bBestScore = Math.max(
                                              ...b.performances.map((p) => p.score),
                                            );
                                            return bBestScore - aBestScore;
                                          })
                                          .map((member) => (
                                            <div
                                              key={member.userId}
                                              className="border-l-2 border-gray-600 pl-3"
                                            >
                                              <div className="text-xs font-medium text-gray-300 mb-1">
                                                {member.name}
                                              </div>
                                              <div className="space-y-1">
                                                {member.performances
                                                  .sort((a, b) => b.score - a.score)
                                                  .map((performance, perfIndex) => (
                                                    <div
                                                      key={perfIndex}
                                                      className="text-xs text-gray-400"
                                                    >
                                                      {performance.rawValue
                                                        ? (() => {
                                                            const activity = activities.find(
                                                              (a) => a.id === activeTab,
                                                            );
                                                            const scoringSystemId =
                                                              activity?.scoringSystemId;
                                                            return formatRawValue(
                                                              performance.rawValue,
                                                              activeTab,
                                                              performance.reps,
                                                              scoringSystemId,
                                                            );
                                                          })()
                                                        : 'No data'}
                                                    </div>
                                                  ))}
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </td>
                                  </tr>
                                ));
                            })()
                          : leaderboardData.workoutLeaderboards
                              ?.find((workout) => workout.activityId === activeTab)
                              ?.entries.sort((a, b) => a.rank - b.rank) // Sort by rank
                              .map((entry) => (
                                <tr key={entry.userId} className="hover:bg-gray-700">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <span className="text-lg font-semibold text-white">
                                        {getRankIcon(entry.rank)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div>
                                        <div className="text-sm font-medium text-white">
                                          {entry.name}
                                        </div>

                                        <div className="text-xs text-gray-400">
                                          Team: {entry.teamName}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-white">
                                      {entry.score.toFixed(1)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-400">
                                      {entry.rawValue
                                        ? (() => {
                                            const activity = activities.find(
                                              (a) => a.id === activeTab,
                                            );
                                            const scoringSystemId = activity?.scoringSystemId;
                                            return formatRawValue(
                                              entry.rawValue,
                                              activeTab,
                                              entry.reps,
                                              scoringSystemId,
                                            );
                                          })()
                                        : ''}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      <NotificationToast
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </div>
  );
}
