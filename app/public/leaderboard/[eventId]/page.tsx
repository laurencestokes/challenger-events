'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { beautifyRawScore } from '@/utils/scoring';
import NotificationToast from '@/components/NotificationToast';
import { useSSEUnauth } from '@/hooks/useSSEUnauth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { QRCodeSVG } from 'qrcode.react';

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
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
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

      <div className="max-w-[90rem] mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Challenger Branding */}
          <div className="flex items-center justify-center space-x-3 mb-8">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-4xl font-bold text-white uppercase tracking-wide font-display">
                Challenger
              </span>
            </a>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-orange-400 to-orange-600 text-white">
              BETA
            </span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 font-display">
            {leaderboardData.eventName}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Live Leaderboard</p>

          {/* QR Code for easy sharing */}
          <div className="flex justify-center mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Scan to view this leaderboard
                </p>
              </div>
              <QRCodeSVG
                value={typeof window !== 'undefined' ? window.location.href : ''}
                size={120}
                level="M"
                includeMargin={true}
                className="mx-auto"
              />
            </div>
          </div>

          {/* Event Details Accordion */}
          {eventDetails && (
            <div className="max-w-4xl mx-auto mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsEventDetailsOpen(!isEventDetailsOpen)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    Event Details
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                      isEventDetailsOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isEventDetailsOpen && (
                  <div className="px-6 pb-6 pt-4 space-y-4">
                    {/* Event Info */}
                    {eventInfo && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {eventInfo}
                        </p>
                      </div>
                    )}

                    {/* Event Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Status
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {eventDetails.status}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Start Date
                          </div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatDate(eventDetails.startDate)}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            End Date
                          </div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatDate(eventDetails.endDate)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Competition Format */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 text-center">
                        Competition Format
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Event Type
                          </div>
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {eventDetails.isTeamEvent ? 'Team' : 'Individual'}
                          </div>
                        </div>
                        {eventDetails.isTeamEvent && eventDetails.teamScoringMethod && (
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Scoring Method
                            </div>
                            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                              {eventDetails.teamScoringMethod}
                            </div>
                          </div>
                        )}
                        {eventDetails.isTeamEvent && eventDetails.maxTeamSize && (
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Max Team Size
                            </div>
                            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                              {eventDetails.maxTeamSize}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        {leaderboardData.isTeamEvent && (
          <div className="flex justify-center mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
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
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 overflow-x-auto px-2">
              {tabs.map((tab) => (
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

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overall' && (
              <div className="space-y-4">
                <div className="overflow-x-auto w-full">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {viewMode === 'team' ? 'Team' : 'Competitor'}
                        </th>
                        {activities.map((activity) => (
                          <th
                            key={activity.id}
                            className="px-8 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            {activity.name}
                          </th>
                        ))}
                        <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {viewMode === 'team'
                        ? (() => {
                            // Get all team members for each team to show individual scores
                            const teamMembers =
                              leaderboardData.overallLeaderboard?.filter((entry) => entry.teamId) ||
                              [];
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
                                <tr
                                  key={team.teamId}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {getRankIcon(index + 1)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
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
                                          <div className="text-sm text-gray-400 dark:text-gray-500">
                                            -
                                          </div>
                                        </td>
                                      );
                                    }

                                    // Show best score and individual performances
                                    const bestScore = memberScores[0];
                                    return (
                                      <td key={activity.id} className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm">
                                          <div className="font-medium text-gray-900 dark:text-white">
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
                                                  className="text-xs text-gray-500 dark:text-gray-400"
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
                                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                                +{memberScores.length - 3} more
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      {team.totalScore.toFixed(1)}
                                    </div>
                                  </td>
                                </tr>
                              ));
                          })()
                        : leaderboardData.overallLeaderboard?.map((entry) => (
                            <tr
                              key={entry.userId}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {getRankIcon(entry.rank)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {entry.name}
                                    </div>

                                    {entry.teamId && entry.teamName && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Team: {entry.teamName}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {activities.map((activity) => {
                                const workoutScore = entry.workoutScores[activity.id];
                                return (
                                  <td key={activity.id} className="px-6 py-4 whitespace-nowrap">
                                    {workoutScore ? (
                                      <div className="text-sm">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {workoutScore.score
                                            ? workoutScore.score.toFixed(1)
                                            : '0.0'}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {workoutScore.rawValue
                                            ? (workoutScore as { scoringSystemId?: string })
                                                .scoringSystemId
                                              ? formatRawValue(
                                                  workoutScore.rawValue,
                                                  activity.id,
                                                  workoutScore.reps,
                                                  (workoutScore as { scoringSystemId?: string })
                                                    .scoringSystemId,
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
                                      <div className="text-sm text-gray-400 dark:text-gray-500">
                                        -
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
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

            {/* Individual Activity Leaderboards */}
            {activeTab !== 'overall' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {activities.find((a) => a.id === activeTab)?.name} Leaderboard
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {viewMode === 'team' ? 'Team' : 'Competitor'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
                                <tr
                                  key={team.teamId}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {getRankIcon(index + 1)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {team.teamName}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
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
                                            className="border-l-2 border-gray-200 dark:border-gray-600 pl-3"
                                          >
                                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                              {member.name}
                                            </div>
                                            <div className="space-y-1">
                                              {member.performances
                                                .sort((a, b) => b.score - a.score)
                                                .map((performance, perfIndex) => (
                                                  <div
                                                    key={perfIndex}
                                                    className="text-xs text-gray-600 dark:text-gray-400"
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
                              <tr
                                key={entry.userId}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                      {getRankIcon(entry.rank)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {entry.name}
                                      </div>

                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Team: {entry.teamName}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {entry.score.toFixed(1)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
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
