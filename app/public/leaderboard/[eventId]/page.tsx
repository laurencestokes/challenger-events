'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@lib/queryKeys';
import { beautifyRawScore } from '@utils/scoring';
import NotificationToast from '@components/NotificationToast';
import { useSSEUnauth } from '@hooks/useSSEUnauth';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';
import Footer from '@components/Footer';
import LeaderboardBarChart from '@components/LeaderboardBarChart';

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
  teamLogoUrl?: string;
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
    teamLogoUrl?: string;
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
  latestResults?: LatestResult[];
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
  logoUrl?: string;
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

interface LatestResult {
  id: string;
  userId: string;
  name: string;
  teamName?: string;
  activityId: string;
  activityName: string;
  score: number;
  rawValue: number;
  reps?: number;
  submittedAt: Date;
  scoringSystemId?: string;
}

export default function PublicEventLeaderboard() {
  const params = useParams();
  const eventId = params.eventId as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overall' | 'team-overall' | string>('overall');
  const [viewMode, setViewMode] = useState<'individual' | 'team'>('individual');
  const [displayMode, setDisplayMode] = useState<'table' | 'barchart'>('table');

  // SSE and notification state
  const { isConnected, lastEvent, error: _sseError } = useSSEUnauth(eventId);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  // TanStack Query: leaderboard data (with 30s refetch interval replacing manual polling)
  const {
    data: leaderboardData,
    isLoading: isLoadingLeaderboard,
    error: leaderboardError,
  } = useQuery({
    queryKey: queryKeys.public.leaderboard(eventId),
    queryFn: async (): Promise<LeaderboardData> => {
      const res = await fetch(`/api/public/leaderboard/${eventId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch leaderboard data');
      return res.json();
    },
    enabled: !!eventId,
    refetchInterval: 30_000,
  });

  // TanStack Query: activities
  const { data: activitiesData, isLoading: isLoadingActivities } = useQuery({
    queryKey: queryKeys.public.activities(eventId),
    queryFn: async (): Promise<Activity[]> => {
      const res = await fetch(`/api/public/events/${eventId}/activities`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch activities data');
      return res.json();
    },
    enabled: !!eventId,
  });

  // TanStack Query: event details
  const { data: eventDetailsData, isLoading: isLoadingEvent } = useQuery({
    queryKey: queryKeys.public.event(eventId),
    queryFn: async (): Promise<EventDetails | null> => {
      const res = await fetch(`/api/public/events/${eventId}`, { cache: 'no-store' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!eventId,
  });

  const isLoading = isLoadingLeaderboard || isLoadingActivities || isLoadingEvent;
  const error =
    leaderboardError instanceof Error
      ? leaderboardError.message
      : leaderboardError
        ? 'Failed to fetch data'
        : '';
  const activities: Activity[] = activitiesData ?? [];
  const eventDetails = eventDetailsData ?? null;
  const eventInfo = eventDetailsData?.description ?? null;
  const latestResults: LatestResult[] = leaderboardData?.latestResults ?? [];

  // Handle SSE events - invalidate queries on leaderboard events
  useEffect(() => {
    if (lastEvent?.type === 'workout_revealed' && lastEvent.workoutName) {
      setNotification({
        show: true,
        message: `🎉 New workout revealed: ${lastEvent.workoutName}!`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.public.leaderboard(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.public.activities(eventId) });
    } else if (lastEvent?.type === 'score_submitted') {
      console.log(
        'Public Leaderboard: Received score_submitted event, refreshing data...',
        lastEvent,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.public.leaderboard(eventId) });
    }
  }, [lastEvent, eventId, queryClient]);

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

  const getAvailableTabs = () => {
    const tabs = [
      { id: 'overall', name: 'Overall' },
      ...(leaderboardData?.workoutLeaderboards?.map((workout) => ({
        id: workout.activityId,
        name: workout.activityName,
      })) || []),
    ];

    return tabs;
  };

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
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 border-primary"></div>
            <p className="text-white text-lg">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01mande-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Error Loading Leaderboard</h1>
            <p className="text-muted text-lg mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: queryKeys.public.leaderboard(eventId) })
              }
              className="px-6 py-3 text-white font-semibold rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#4682B4' }}
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
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-surface-high rounded-full flex items-center justify-center mx-auto mb-6">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">No Leaderboard Data</h1>
            <p className="text-muted text-lg max-w-md mx-auto">
              No leaderboard data is available for this event.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = getAvailableTabs();

  return (
    <div className="min-h-screen bg-surface-high flex flex-col">
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
        <div className="bg-surface-low/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-surface-high/50">
          <div className="text-center mb-2">
            <p className="text-xs text-text-secondary mb-1">Share</p>
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
            {/* Event Information Card */}
            {eventDetails && (
              <div className="mt-6">
                <div className="w-full h-80 bg-surface-low rounded-2xl relative overflow-hidden">
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
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h1 className="text-white font-bold text-3xl mb-2 font-headline text-left">
                          {leaderboardData.eventName}
                        </h1>
                        {eventInfo && (
                          <p className="text-white/90 text-xl text-left">{eventInfo}</p>
                        )}
                      </div>
                      {/* Challenger Branding */}
                      <div className="flex flex-col items-center space-y-2 ml-6">
                        <a
                          href="/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity"
                        >
                          <Image
                            src="/challengerco-logo-text-only.png"
                            alt="The Challenger Co."
                            width={120}
                            height={48}
                            className="h-8 w-auto"
                            priority
                          />
                        </a>
                        <span className="px-3 py-1 text-xs font-bold bg-primary text-white rounded-full  font-headline">
                          BETA
                        </span>
                      </div>
                    </div>
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
                        <span className="px-3 py-1 text-sm font-medium rounded-full bg-surface-low/20 text-white">
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
          <div className="flex justify-center gap-4 mb-6 flex-wrap">
            {leaderboardData.isTeamEvent && (
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('individual')}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    viewMode === 'individual'
                      ? 'text-white'
                      : 'text-muted hover:text-white bg-surface-high hover:bg-surface-high'
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
                      : 'text-muted hover:text-white bg-surface-high hover:bg-surface-high'
                  }`}
                  style={viewMode === 'team' ? { backgroundColor: '#4682b4' } : {}}
                >
                  Team
                </button>
              </div>
            )}
            {/* Display Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setDisplayMode('table')}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  displayMode === 'table'
                    ? 'text-white'
                    : 'text-muted hover:text-white bg-surface-high hover:bg-surface-high'
                }`}
                style={displayMode === 'table' ? { backgroundColor: '#4682b4' } : {}}
              >
                📊 Table
              </button>
              <button
                onClick={() => setDisplayMode('barchart')}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  displayMode === 'barchart'
                    ? 'text-white'
                    : 'text-muted hover:text-white bg-surface-high hover:bg-surface-high'
                }`}
                style={displayMode === 'barchart' ? { backgroundColor: '#4682b4' } : {}}
              >
                📈 Chart
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="panel rounded-2xl shadow-lg mb-6 ">
            <div className="border-b border-surface-high/50">
              <nav className="flex space-x-8 overflow-x-auto px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id ? '' : 'border-transparent text-muted hover:text-white'
                    }`}
                    style={
                      activeTab === tab.id ? { borderBottomColor: '#4682b4', color: '#4682b4' } : {}
                    }
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
                          <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-gray-400 shadow-lg">
                            {/* Rank Badge */}
                            <div className="absolute -top-3 -left-3 w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">#2</span>
                            </div>

                            {/* Team Avatar */}
                            <div className="flex justify-center mb-4">
                              <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center border-2 border-gray-400 overflow-hidden">
                                <Image
                                  src={
                                    leaderboardData.teamOverallLeaderboard[1].logoUrl ||
                                    '/challenger-logo-no-text.png'
                                  }
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
                          <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-yellow-400 shadow-xl transform scale-105">
                            {/* Rank Badge */}
                            <div className="absolute -top-3 -left-3 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                              <span className="text-text-primary font-bold text-lg">#1</span>
                            </div>

                            {/* Team Avatar */}
                            <div className="flex justify-center mb-4">
                              <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-400 overflow-hidden">
                                <Image
                                  src={
                                    leaderboardData.teamOverallLeaderboard[0].logoUrl ||
                                    '/challenger-logo-no-text.png'
                                  }
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
                          <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-amber-600 shadow-lg">
                            {/* Rank Badge */}
                            <div className="absolute -top-3 -left-3 w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">#3</span>
                            </div>

                            {/* Team Avatar */}
                            <div className="flex justify-center mb-4">
                              <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center border-2 border-amber-600 overflow-hidden">
                                <Image
                                  src={
                                    leaderboardData.teamOverallLeaderboard[2].logoUrl ||
                                    '/challenger-logo-no-text.png'
                                  }
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
                          <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-gray-400 shadow-lg">
                            {/* Rank Badge */}
                            <div className="absolute -top-3 -left-3 w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">#2</span>
                            </div>

                            {/* Avatar */}
                            <div className="flex justify-center mb-4">
                              <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center border-2 border-gray-400 overflow-hidden">
                                <Image
                                  src={
                                    leaderboardData.overallLeaderboard[1].teamLogoUrl ||
                                    '/challenger-logo-no-text.png'
                                  }
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
                                <p className="text-muted text-sm">
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
                          <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-yellow-400 shadow-xl transform scale-105">
                            {/* Rank Badge */}
                            <div className="absolute -top-3 -left-3 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                              <span className="text-text-primary font-bold text-lg">#1</span>
                            </div>

                            {/* Avatar */}
                            <div className="flex justify-center mb-4">
                              <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-400 overflow-hidden">
                                <Image
                                  src={
                                    leaderboardData.overallLeaderboard[0].teamLogoUrl ||
                                    '/challenger-logo-no-text.png'
                                  }
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
                                <p className="text-muted text-sm">
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
                          <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-amber-600 shadow-lg">
                            {/* Rank Badge */}
                            <div className="absolute -top-3 -left-3 w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">#3</span>
                            </div>

                            {/* Avatar */}
                            <div className="flex justify-center mb-4">
                              <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center border-2 border-amber-600 overflow-hidden">
                                <Image
                                  src={
                                    leaderboardData.overallLeaderboard[2].teamLogoUrl ||
                                    '/challenger-logo-no-text.png'
                                  }
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
                                <p className="text-muted text-sm">
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

                  {/* Full Leaderboard Table/Chart */}
                  {leaderboardData.overallLeaderboard &&
                    leaderboardData.overallLeaderboard.length > 0 && (
                      <div className="transition-opacity duration-300">
                        <h3 className="text-white text-lg font-semibold mb-4">Full Leaderboard</h3>
                        {displayMode === 'table' ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-600">
                              <thead className="bg-surface-high">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Rank
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    {viewMode === 'team' ? 'Team' : 'Competitor'}
                                  </th>
                                  {activities.map((activity) => (
                                    <th
                                      key={activity.id}
                                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                                    >
                                      {activity.name}
                                    </th>
                                  ))}
                                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-surface-low divide-y divide-gray-600">
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
                                          <tr key={team.teamId} className="hover:bg-surface-high">
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
                                                    <div className="text-sm text-muted">-</div>
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
                                                      {memberScores
                                                        .slice(0, 3)
                                                        .map((score, idx) => {
                                                          // Find the team member who achieved this score
                                                          const member = team.members.find(
                                                            (m) =>
                                                              m.workoutScores[activity.id]
                                                                ?.score === score.score &&
                                                              m.workoutScores[activity.id]
                                                                ?.rawValue === score.rawValue,
                                                          );
                                                          return (
                                                            <div
                                                              key={idx}
                                                              className="text-xs text-muted"
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
                                                        <div className="text-xs text-muted">
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
                                      <tr key={entry.userId} className="hover:bg-surface-high">
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
                                                <div className="text-xs text-muted">
                                                  {entry.teamName}
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
                                                  <div className="text-xs text-muted">
                                                    {workoutScore.rawValue
                                                      ? (
                                                          workoutScore as {
                                                            scoringSystemId?: string;
                                                          }
                                                        ).scoringSystemId
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
                                                <div className="text-sm text-muted">-</div>
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
                        ) : (
                          <LeaderboardBarChart
                            entries={
                              viewMode === 'team'
                                ? (() => {
                                    // Group by team for team view
                                    const teamMembers = new Map<
                                      string,
                                      Array<{
                                        userId: string;
                                        name: string;
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
                                        totalScore: number;
                                      }>
                                    >();

                                    const teamEntries = new Map<
                                      string,
                                      {
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
                                    >();

                                    leaderboardData.overallLeaderboard.forEach((member) => {
                                      if (!member.teamId || !member.teamName) return;

                                      // Add member to team
                                      if (!teamMembers.has(member.teamId)) {
                                        teamMembers.set(member.teamId, []);
                                      }
                                      teamMembers.get(member.teamId)!.push({
                                        userId: member.userId,
                                        name: member.name,
                                        workoutScores: member.workoutScores,
                                        totalScore: member.totalScore,
                                      });

                                      // Update team entry
                                      if (!teamEntries.has(member.teamId)) {
                                        teamEntries.set(member.teamId, {
                                          teamId: member.teamId,
                                          teamName: member.teamName,
                                          totalScore: 0,
                                          workoutScores: {},
                                          rank: member.rank,
                                        });
                                      }

                                      const team = teamEntries.get(member.teamId)!;
                                      team.totalScore += member.totalScore;

                                      // Aggregate workout scores (sum for team)
                                      activities.forEach((activity) => {
                                        const memberScore = member.workoutScores[activity.id];
                                        if (memberScore) {
                                          if (!team.workoutScores[activity.id]) {
                                            team.workoutScores[activity.id] = {
                                              score: 0,
                                              rawValue: 0,
                                              rank: memberScore.rank,
                                              activityName: memberScore.activityName,
                                            };
                                          }
                                          team.workoutScores[activity.id].score +=
                                            memberScore.score;
                                        }
                                      });
                                    });

                                    // Convert to array and sort by total score, then assign ranks
                                    const sortedTeams = Array.from(teamEntries.values())
                                      .sort((a, b) => b.totalScore - a.totalScore)
                                      .map((team, index) => ({
                                        ...team,
                                        name: team.teamName,
                                        email: '',
                                        userId: team.teamId,
                                        rank: index + 1,
                                      }));

                                    // Store team members in a way the component can access
                                    sortedTeams.forEach((team) => {
                                      (team as unknown as { teamMembers: unknown }).teamMembers =
                                        teamMembers;
                                    });

                                    return sortedTeams;
                                  })()
                                : leaderboardData.overallLeaderboard
                            }
                            activities={activities}
                            maxScore={
                              Math.max(
                                ...(viewMode === 'team'
                                  ? (() => {
                                      // Calculate max team total score
                                      const teamTotals = new Map<string, number>();
                                      leaderboardData.overallLeaderboard.forEach((member) => {
                                        if (member.teamId) {
                                          teamTotals.set(
                                            member.teamId,
                                            (teamTotals.get(member.teamId) || 0) +
                                              member.totalScore,
                                          );
                                        }
                                      });
                                      return Array.from(teamTotals.values());
                                    })()
                                  : leaderboardData.overallLeaderboard.map((e) => e.totalScore)),
                              ) || 1
                            }
                            isTeamView={viewMode === 'team'}
                            formatRawValue={formatRawValue}
                            teamMembers={
                              viewMode === 'team'
                                ? (() => {
                                    const teamMembersMap = new Map<
                                      string,
                                      Array<{
                                        userId: string;
                                        name: string;
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
                                        totalScore: number;
                                      }>
                                    >();

                                    leaderboardData.overallLeaderboard.forEach((member) => {
                                      if (!member.teamId) return;

                                      if (!teamMembersMap.has(member.teamId)) {
                                        teamMembersMap.set(member.teamId, []);
                                      }
                                      teamMembersMap.get(member.teamId)!.push({
                                        userId: member.userId,
                                        name: member.name,
                                        workoutScores: member.workoutScores,
                                        totalScore: member.totalScore,
                                      });
                                    });

                                    return teamMembersMap;
                                  })()
                                : undefined
                            }
                          />
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Individual Activity Leaderboards */}
              {activeTab !== 'overall' && (
                <div className="space-y-4 transition-opacity duration-300">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {activities.find((a) => a.id === activeTab)?.name} Leaderboard
                  </h3>

                  {/* Top 3 Podium Cards for Individual Activity */}
                  {(() => {
                    const workoutLeaderboard = leaderboardData.workoutLeaderboards?.find(
                      (workout) => workout.activityId === activeTab,
                    );

                    if (!workoutLeaderboard || workoutLeaderboard.entries.length === 0) {
                      return null;
                    }

                    const sortedEntries = [...workoutLeaderboard.entries].sort(
                      (a, b) => a.rank - b.rank,
                    );

                    if (viewMode === 'team') {
                      // Group by team for team view
                      const teamGroups = new Map<
                        string,
                        {
                          teamId?: string;
                          teamName?: string;
                          members: typeof sortedEntries;
                          bestScore: number;
                          totalScore: number;
                        }
                      >();

                      sortedEntries.forEach((entry) => {
                        if (!entry.teamId || !entry.teamName) return;
                        const teamKey = entry.teamId;

                        if (!teamGroups.has(teamKey)) {
                          teamGroups.set(teamKey, {
                            teamId: entry.teamId,
                            teamName: entry.teamName,
                            members: [],
                            bestScore: entry.score,
                            totalScore: 0,
                          });
                        }

                        const team = teamGroups.get(teamKey)!;
                        team.members.push(entry);
                        team.bestScore = Math.max(team.bestScore, entry.score);
                        team.totalScore += entry.score;
                      });

                      const teamEntries = Array.from(teamGroups.values())
                        .sort((a, b) => b.totalScore - a.totalScore)
                        .slice(0, 3);

                      if (teamEntries.length === 0) return null;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          {/* 2nd Place Team (Silver) */}
                          {teamEntries[1] && (
                            <div className="order-2 md:order-1 relative z-10">
                              <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-gray-400 shadow-lg">
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">#2</span>
                                </div>
                                <div className="flex justify-center mb-4">
                                  <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center border-2 border-gray-400 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={teamEntries[1].teamName || 'Team'}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-lg">
                                    {teamEntries[1].teamName}
                                  </h3>
                                </div>
                                <div className="text-center">
                                  <div className="text-white font-bold text-2xl">
                                    {teamEntries[1].totalScore.toFixed(1)}
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {teamEntries[1].members
                                      .sort((a, b) => b.score - a.score)
                                      .map((member, idx) => (
                                        <div
                                          key={member.userId || idx}
                                          className="text-xs text-text-secondary text-center"
                                        >
                                          <span className="font-medium">{member.name}</span>
                                          {' - '}
                                          {formatRawValue(
                                            member.rawValue,
                                            activeTab,
                                            member.reps,
                                            member.scoringSystemId,
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 1st Place Team (Gold) */}
                          {teamEntries[0] && (
                            <div className="order-1 md:order-2 relative z-30">
                              <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-yellow-400 shadow-xl transform scale-105">
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <span className="text-text-primary font-bold text-lg">#1</span>
                                </div>
                                <div className="flex justify-center mb-4">
                                  <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-400 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={teamEntries[0].teamName || 'Team'}
                                      width={96}
                                      height={96}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-xl">
                                    {teamEntries[0].teamName}
                                  </h3>
                                </div>
                                <div className="text-center">
                                  <div className="text-white font-bold text-3xl">
                                    {teamEntries[0].totalScore.toFixed(1)}
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {teamEntries[0].members
                                      .sort((a, b) => b.score - a.score)
                                      .map((member, idx) => (
                                        <div
                                          key={member.userId || idx}
                                          className="text-xs text-text-secondary text-center"
                                        >
                                          <span className="font-medium">{member.name}</span>
                                          {' - '}
                                          {formatRawValue(
                                            member.rawValue,
                                            activeTab,
                                            member.reps,
                                            member.scoringSystemId,
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3rd Place Team (Bronze) */}
                          {teamEntries[2] && (
                            <div className="order-3 relative z-20">
                              <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-amber-600 shadow-lg">
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">#3</span>
                                </div>
                                <div className="flex justify-center mb-4">
                                  <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center border-2 border-amber-600 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={teamEntries[2].teamName || 'Team'}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-lg">
                                    {teamEntries[2].teamName}
                                  </h3>
                                </div>
                                <div className="text-center">
                                  <div className="text-white font-bold text-2xl">
                                    {teamEntries[2].totalScore.toFixed(1)}
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {teamEntries[2].members
                                      .sort((a, b) => b.score - a.score)
                                      .map((member, idx) => (
                                        <div
                                          key={member.userId || idx}
                                          className="text-xs text-text-secondary text-center"
                                        >
                                          <span className="font-medium">{member.name}</span>
                                          {' - '}
                                          {formatRawValue(
                                            member.rawValue,
                                            activeTab,
                                            member.reps,
                                            member.scoringSystemId,
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Individual view podium
                      if (sortedEntries.length === 0) return null;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          {/* 2nd Place (Silver) */}
                          {sortedEntries[1] && (
                            <div className="order-2 md:order-1 relative z-10">
                              <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-gray-400 shadow-lg">
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">#2</span>
                                </div>
                                <div className="flex justify-center mb-4">
                                  <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center border-2 border-gray-400 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={sortedEntries[1].name}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-lg">
                                    {sortedEntries[1].name}
                                  </h3>
                                  {sortedEntries[1].teamName && (
                                    <p className="text-muted text-sm">
                                      {sortedEntries[1].teamName}
                                    </p>
                                  )}
                                </div>
                                <div className="text-center">
                                  <div className="text-white font-bold text-2xl">
                                    {sortedEntries[1].score.toFixed(1)}
                                  </div>
                                  <div className="text-muted text-sm mt-1">
                                    {formatRawValue(
                                      sortedEntries[1].rawValue,
                                      activeTab,
                                      sortedEntries[1].reps,
                                      sortedEntries[1].scoringSystemId,
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 1st Place (Gold) */}
                          {sortedEntries[0] && (
                            <div className="order-1 md:order-2 relative z-30">
                              <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-yellow-400 shadow-xl transform scale-105">
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <span className="text-text-primary font-bold text-lg">#1</span>
                                </div>
                                <div className="flex justify-center mb-4">
                                  <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-400 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={sortedEntries[0].name}
                                      width={96}
                                      height={96}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-xl">
                                    {sortedEntries[0].name}
                                  </h3>
                                  {sortedEntries[0].teamName && (
                                    <p className="text-muted text-sm">
                                      {sortedEntries[0].teamName}
                                    </p>
                                  )}
                                </div>
                                <div className="text-center">
                                  <div className="text-white font-bold text-3xl">
                                    {sortedEntries[0].score.toFixed(1)}
                                  </div>
                                  <div className="text-muted text-sm mt-1">
                                    {formatRawValue(
                                      sortedEntries[0].rawValue,
                                      activeTab,
                                      sortedEntries[0].reps,
                                      sortedEntries[0].scoringSystemId,
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3rd Place (Bronze) */}
                          {sortedEntries[2] && (
                            <div className="order-3 relative z-20">
                              <div className="relative bg-surface-low rounded-2xl p-6 border-4 border-amber-600 shadow-lg">
                                <div className="absolute -top-3 -left-3 w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">#3</span>
                                </div>
                                <div className="flex justify-center mb-4">
                                  <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center border-2 border-amber-600 overflow-hidden">
                                    <Image
                                      src="/challenger-logo-no-text.png"
                                      alt={sortedEntries[2].name}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                                <div className="text-center mb-4">
                                  <h3 className="text-white font-semibold text-lg">
                                    {sortedEntries[2].name}
                                  </h3>
                                  {sortedEntries[2].teamName && (
                                    <p className="text-muted text-sm">
                                      {sortedEntries[2].teamName}
                                    </p>
                                  )}
                                </div>
                                <div className="text-center">
                                  <div className="text-white font-bold text-2xl">
                                    {sortedEntries[2].score.toFixed(1)}
                                  </div>
                                  <div className="text-muted text-sm mt-1">
                                    {formatRawValue(
                                      sortedEntries[2].rawValue,
                                      activeTab,
                                      sortedEntries[2].reps,
                                      sortedEntries[2].scoringSystemId,
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })()}

                  {displayMode === 'table' ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-600">
                        <thead className="bg-surface-high">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Rank
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              {viewMode === 'team' ? 'Team' : 'Competitor'}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Performance
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-surface-low divide-y divide-gray-600">
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
                                    <tr key={team.teamId} className="hover:bg-surface-high">
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
                                                className="border-l-2 border-border pl-3"
                                              >
                                                <div className="text-xs font-medium text-text-secondary mb-1">
                                                  {member.name}
                                                </div>
                                                <div className="space-y-1">
                                                  {member.performances
                                                    .sort((a, b) => b.score - a.score)
                                                    .map((performance, perfIndex) => (
                                                      <div
                                                        key={perfIndex}
                                                        className="text-xs text-muted"
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
                                  <tr key={entry.userId} className="hover:bg-surface-high">
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

                                          {entry.teamName && (
                                            <div className="text-xs text-muted">
                                              {entry.teamName}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-white">
                                        {entry.score.toFixed(1)}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-muted">
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
                  ) : (
                    <LeaderboardBarChart
                      entries={
                        viewMode === 'team'
                          ? (() => {
                              const workoutEntries =
                                leaderboardData.workoutLeaderboards
                                  ?.find((workout) => workout.activityId === activeTab)
                                  ?.entries.filter((entry) => entry.teamId) || [];

                              // Group by team
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
                                  acc[teamKey].members.push(entry);
                                  return acc;
                                },
                                {} as Record<
                                  string,
                                  {
                                    teamId?: string;
                                    teamName?: string;
                                    members: typeof workoutEntries;
                                  }
                                >,
                              );

                              // Convert to team entries with aggregated scores
                              const teamEntries = Object.values(groupedByTeam)
                                .map((team) => {
                                  const teamTotalScore = team.members.reduce(
                                    (total, member) => total + member.score,
                                    0,
                                  );
                                  const bestScore = Math.max(...team.members.map((m) => m.score));
                                  const bestMember = team.members.find(
                                    (m) => m.score === bestScore,
                                  );

                                  return {
                                    teamId: team.teamId,
                                    userId: team.teamId || '',
                                    name: team.teamName || 'Unknown Team',
                                    email: '',
                                    totalScore: teamTotalScore,
                                    workoutScores: {
                                      [activeTab]: {
                                        score: bestScore,
                                        rawValue: bestMember?.rawValue || 0,
                                        reps: bestMember?.reps,
                                        rank: bestMember?.rank || 1,
                                        activityName:
                                          leaderboardData.workoutLeaderboards?.find(
                                            (w) => w.activityId === activeTab,
                                          )?.activityName || '',
                                        scoringSystemId: bestMember?.scoringSystemId,
                                      },
                                    },
                                    rank: bestMember?.rank || 1,
                                  };
                                })
                                .sort((a, b) => b.totalScore - a.totalScore)
                                .map((team, index) => ({
                                  ...team,
                                  rank: index + 1,
                                }));

                              return teamEntries;
                            })()
                          : leaderboardData.workoutLeaderboards
                              ?.find((workout) => workout.activityId === activeTab)
                              ?.entries.map((entry) => ({
                                userId: entry.userId,
                                name: entry.name,
                                teamName: entry.teamName,
                                totalScore: entry.score,
                                workoutScores: {
                                  [activeTab]: {
                                    score: entry.score,
                                    rawValue: entry.rawValue,
                                    reps: entry.reps,
                                    rank: entry.rank,
                                    activityName:
                                      leaderboardData.workoutLeaderboards?.find(
                                        (w) => w.activityId === activeTab,
                                      )?.activityName || '',
                                    scoringSystemId: entry.scoringSystemId,
                                  },
                                },
                                rank: entry.rank,
                              })) || []
                      }
                      activities={[activities.find((a) => a.id === activeTab)!].filter(Boolean)}
                      maxScore={
                        viewMode === 'team'
                          ? (() => {
                              const workoutEntries =
                                leaderboardData.workoutLeaderboards
                                  ?.find((workout) => workout.activityId === activeTab)
                                  ?.entries.filter((entry) => entry.teamId) || [];

                              const teamTotals = new Map<string, number>();
                              workoutEntries.forEach((entry) => {
                                if (entry.teamId) {
                                  teamTotals.set(
                                    entry.teamId,
                                    (teamTotals.get(entry.teamId) || 0) + entry.score,
                                  );
                                }
                              });
                              return Math.max(...Array.from(teamTotals.values()), 0) || 1;
                            })()
                          : Math.max(
                              ...(leaderboardData.workoutLeaderboards
                                ?.find((workout) => workout.activityId === activeTab)
                                ?.entries.map((e) => e.score) || [0]),
                            ) || 1
                      }
                      isTeamView={viewMode === 'team'}
                      formatRawValue={formatRawValue}
                      teamMembers={
                        viewMode === 'team'
                          ? (() => {
                              const workoutEntries =
                                leaderboardData.workoutLeaderboards
                                  ?.find((workout) => workout.activityId === activeTab)
                                  ?.entries.filter((entry) => entry.teamId) || [];

                              const teamMembersMap = new Map<
                                string,
                                Array<{
                                  userId: string;
                                  name: string;
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
                                  totalScore: number;
                                }>
                              >();

                              workoutEntries.forEach((entry) => {
                                if (!entry.teamId) return;

                                if (!teamMembersMap.has(entry.teamId)) {
                                  teamMembersMap.set(entry.teamId, []);
                                }
                                teamMembersMap.get(entry.teamId)!.push({
                                  userId: entry.userId,
                                  name: entry.name,
                                  workoutScores: {
                                    [activeTab]: {
                                      score: entry.score,
                                      rawValue: entry.rawValue,
                                      reps: entry.reps,
                                      rank: entry.rank,
                                      activityName:
                                        leaderboardData.workoutLeaderboards?.find(
                                          (w) => w.activityId === activeTab,
                                        )?.activityName || '',
                                      scoringSystemId: entry.scoringSystemId,
                                    },
                                  },
                                  totalScore: entry.score,
                                });
                              });

                              return teamMembersMap;
                            })()
                          : undefined
                      }
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Latest Results Section */}
          {(() => {
            // Filter latest results based on active tab
            const filteredResults =
              activeTab === 'overall'
                ? latestResults.slice(0, 5) // Limit to 5 most recent on overall tab
                : latestResults.filter((result) => {
                    const matches = result.activityId === activeTab;
                    return matches;
                  });

            if (filteredResults.length === 0) return null;

            return (
              <div className="panel rounded-2xl shadow-lg mb-6 ">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Latest Results</h2>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-muted">Live Updates</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead className="bg-surface-high">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Competitor
                          </th>
                          {activeTab === 'overall' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                              Activity
                            </th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Performance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface-low divide-y divide-gray-600">
                        {filteredResults.map((result) => (
                          <tr key={result.id} className="hover:bg-surface-high">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {result.name}
                                  </div>
                                  {result.teamName && (
                                    <div className="text-xs text-muted">{result.teamName}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            {activeTab === 'overall' && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-text-secondary">
                                  {result.activityName}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-white">
                                {result.score.toFixed(1)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-muted">
                                {result.rawValue
                                  ? formatRawValue(
                                      result.rawValue,
                                      result.activityId,
                                      result.reps,
                                      result.scoringSystemId,
                                    )
                                  : 'No data'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-muted">
                                {new Date(result.submittedAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Notification Toast */}
      <NotificationToast
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />

      <Footer />
    </div>
  );
}
