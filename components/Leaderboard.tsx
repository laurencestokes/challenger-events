'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';

interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
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
    rank: number;
    teamId?: string;
    teamName?: string;
  }[];
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
    rank: number;
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

interface LeaderboardProps {
  eventId: string;
}

export default function Leaderboard({ eventId }: LeaderboardProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overall' | string>('overall');
  const [activities, setActivities] = useState<{ id: string; unit: string }[]>([]);

  const getActivityUnit = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    return activity?.unit || '';
  };

  const formatRawValue = (rawValue: number, unit: string) => {
    // For rowing events with seconds unit, convert to mm:ss format
    if (unit === 'seconds' && rawValue > 0) {
      const minutes = Math.floor(rawValue / 60);
      const seconds = Math.floor(rawValue % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    // For other units, use the standard format
    return `${rawValue.toFixed(1)} ${unit}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leaderboardData, activitiesData] = await Promise.all([
          api.get(`/api/events/${eventId}/leaderboard`),
          api.get(`/api/events/${eventId}/activities`),
        ]);
        setLeaderboardData(leaderboardData);
        setActivities(activitiesData);
      } catch (error: unknown) {
        console.error('Error fetching data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

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

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error-600 dark:text-error-400">{error}</p>
      </div>
    );
  }

  if (!leaderboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No leaderboard data available.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overall', name: 'Overall Leaderboard' },
    ...leaderboardData.workoutLeaderboards.map((workout) => ({
      id: workout.activityId,
      name: workout.activityName,
    })),
    // Add team leaderboards if this is a team event
    ...(leaderboardData.isTeamEvent
      ? [
          { id: 'team-overall', name: 'Team Overall' },
          ...(leaderboardData.teamWorkoutLeaderboards || []).map((workout) => ({
            id: `team-${workout.activityId}`,
            name: `Team ${workout.activityName}`,
          })),
        ]
      : []),
  ];

  const renderOverallLeaderboard = () => (
    <div className="space-y-4">
      {leaderboardData.overallLeaderboard.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No scores submitted yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {leaderboardData.isTeamEvent ? 'Competitor / Team' : 'Competitor'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Score
                </th>
                {leaderboardData.workoutLeaderboards.map((workout) => (
                  <th
                    key={workout.activityId}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {workout.activityName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboardData.overallLeaderboard.map((entry) => (
                <tr key={entry.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getRankIcon(entry.rank)}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{entry.email}</div>
                      {entry.teamId && entry.teamName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Team: {entry.teamName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {entry.totalScore ? entry.totalScore.toFixed(1) : '0.0'}
                    </div>
                  </td>
                  {leaderboardData.workoutLeaderboards.map((workout) => {
                    const workoutScore = entry.workoutScores[workout.activityId];
                    return (
                      <td key={workout.activityId} className="px-6 py-4 whitespace-nowrap">
                        {workoutScore ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {workoutScore.score ? workoutScore.score.toFixed(1) : '0.0'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {workoutScore.rawValue
                                ? formatRawValue(
                                    workoutScore.rawValue,
                                    getActivityUnit(workout.activityId),
                                  )
                                : ''}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Rank: {workoutScore.rank}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 dark:text-gray-500">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderWorkoutLeaderboard = (workoutId: string) => {
    const workout = leaderboardData.workoutLeaderboards.find((w) => w.activityId === workoutId);
    if (!workout) return null;

    return (
      <div className="space-y-4">
        {workout.entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No scores submitted for this workout yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {leaderboardData.isTeamEvent ? 'Competitor / Team' : 'Competitor'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {workout.entries.map((entry) => (
                  <tr key={entry.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getRankIcon(entry.rank)}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {entry.email}
                        </div>
                        {entry.teamId && entry.teamName && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Team: {entry.teamName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {entry.score ? entry.score.toFixed(1) : '0.0'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.rawValue
                            ? formatRawValue(entry.rawValue, getActivityUnit(workout.activityId))
                            : ''}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderTeamOverallLeaderboard = () => {
    if (!leaderboardData.teamOverallLeaderboard) return null;

    return (
      <div className="space-y-4">
        {leaderboardData.teamOverallLeaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No team scores submitted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Score
                  </th>
                  {leaderboardData.workoutLeaderboards.map((workout) => (
                    <th
                      key={workout.activityId}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      {workout.activityName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {leaderboardData.teamOverallLeaderboard.map((entry) => (
                  <tr key={entry.teamId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getRankIcon(entry.rank)}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.teamName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Scoring: {leaderboardData.teamScoringMethod || 'SUM'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {entry.totalScore ? entry.totalScore.toFixed(1) : '0.0'}
                      </div>
                    </td>
                    {leaderboardData.workoutLeaderboards.map((workout) => {
                      const workoutScore = entry.workoutScores[workout.activityId];
                      return (
                        <td key={workout.activityId} className="px-6 py-4 whitespace-nowrap">
                          {workoutScore ? (
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {workoutScore.score ? workoutScore.score.toFixed(1) : '0.0'}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                Rank: {workoutScore.rank}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderTeamWorkoutLeaderboard = (workoutId: string) => {
    const teamWorkoutId = workoutId.replace('team-', '');
    const workout = leaderboardData.teamWorkoutLeaderboards?.find(
      (w) => w.activityId === teamWorkoutId,
    );
    if (!workout) return null;

    return (
      <div className="space-y-4">
        {workout.entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No team scores submitted for this workout yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {workout.entries.map((entry) => (
                  <tr key={entry.teamId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getRankIcon(entry.rank)}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.teamName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {entry.score ? entry.score.toFixed(1) : '0.0'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.rawValue
                            ? formatRawValue(entry.rawValue, getActivityUnit(teamWorkoutId))
                            : ''}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Leaderboard</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overall'
          ? renderOverallLeaderboard()
          : activeTab === 'team-overall'
            ? renderTeamOverallLeaderboard()
            : activeTab.startsWith('team-')
              ? renderTeamWorkoutLeaderboard(activeTab)
              : renderWorkoutLeaderboard(activeTab)}
      </div>
    </div>
  );
}
