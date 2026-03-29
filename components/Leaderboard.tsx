'use client';

import { useState, useEffect } from 'react';
import { api } from '@lib/api-client';
import { beautifyRawScore } from '@utils/scoring';

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

  const formatRawValue = (
    rawValue: number,
    activityId: string,
    reps?: number,
    scoringSystemId?: string,
  ) => {
    // Use scoringSystemId if available, otherwise fall back to activityId
    const canonicalActivityId = scoringSystemId || activityId;
    const result = beautifyRawScore(rawValue, canonicalActivityId, reps);
    return result;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const leaderboardData = await api.get(`/api/events/${eventId}/leaderboard`);
        setLeaderboardData(leaderboardData);
      } catch (error: unknown) {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-text-secondary">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (!leaderboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted">No leaderboard data available.</p>
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
          <p className="text-muted">No scores submitted yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-high">
            <thead className="bg-surface-high">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {leaderboardData.isTeamEvent ? 'Competitor / Team' : 'Competitor'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Total Score
                </th>
                {leaderboardData.workoutLeaderboards.map((workout) => (
                  <th
                    key={workout.activityId}
                    className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider"
                  >
                    {workout.activityName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-surface-low divide-y divide-surface-high">
              {leaderboardData.overallLeaderboard.map((entry) => (
                <tr key={entry.userId} className="hover:bg-surface-high">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getRankIcon(entry.rank)}</span>
                      <span className="text-sm font-medium text-text-primary">{entry.rank}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-text-primary">{entry.name}</div>
                      <div className="text-sm text-text-secondary">{entry.email}</div>
                      {entry.teamId && entry.teamName && (
                        <div className="text-xs text-text-secondary">Team: {entry.teamName}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-text-primary">
                      {entry.totalScore ? entry.totalScore.toFixed(1) : '0.0'}
                    </div>
                  </td>
                  {leaderboardData.workoutLeaderboards.map((workout) => {
                    const workoutScore = entry.workoutScores[workout.activityId];
                    return (
                      <td key={workout.activityId} className="px-6 py-4 whitespace-nowrap">
                        {workoutScore ? (
                          <div className="text-sm">
                            <div className="font-medium text-text-primary">
                              {workoutScore.score ? workoutScore.score.toFixed(1) : '0.0'}
                            </div>
                            <div className="text-xs text-muted">
                              {workoutScore.rawValue
                                ? formatRawValue(
                                    workoutScore.rawValue,
                                    workout.activityId,
                                    workoutScore.reps,
                                    workoutScore.scoringSystemId,
                                  )
                                : ''}
                            </div>
                            <div className="text-xs text-muted">Rank: {workoutScore.rank}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted">-</div>
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
            <p className="text-muted">No scores submitted for this workout yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-high">
              <thead className="bg-surface-high">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    {leaderboardData.isTeamEvent ? 'Competitor / Team' : 'Competitor'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface-low divide-y divide-surface-high">
                {workout.entries.map((entry) => (
                  <tr key={entry.userId} className="hover:bg-surface-high">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getRankIcon(entry.rank)}</span>
                        <span className="text-sm font-medium text-text-primary">{entry.rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{entry.name}</div>
                        <div className="text-sm text-text-secondary">{entry.email}</div>
                        {entry.teamId && entry.teamName && (
                          <div className="text-xs text-text-secondary">Team: {entry.teamName}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-bold text-text-primary">
                          {entry.score ? entry.score.toFixed(1) : '0.0'}
                        </div>
                        <div className="text-xs text-muted">
                          {entry.rawValue
                            ? formatRawValue(
                                entry.rawValue,
                                workout.activityId,
                                entry.reps,
                                entry.scoringSystemId,
                              )
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
            <p className="text-muted">No team scores submitted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-high">
              <thead className="bg-surface-high">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Total Score
                  </th>
                  {leaderboardData.workoutLeaderboards.map((workout) => (
                    <th
                      key={workout.activityId}
                      className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider"
                    >
                      {workout.activityName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-surface-low divide-y divide-surface-high">
                {leaderboardData.teamOverallLeaderboard.map((entry) => (
                  <tr key={entry.teamId} className="hover:bg-surface-high">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getRankIcon(entry.rank)}</span>
                        <span className="text-sm font-medium text-text-primary">{entry.rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {entry.teamName}
                        </div>
                        <div className="text-xs text-muted">
                          Scoring: {leaderboardData.teamScoringMethod || 'SUM'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-text-primary">
                        {entry.totalScore ? entry.totalScore.toFixed(1) : '0.0'}
                      </div>
                    </td>
                    {leaderboardData.workoutLeaderboards.map((workout) => {
                      const workoutScore = entry.workoutScores[workout.activityId];
                      return (
                        <td key={workout.activityId} className="px-6 py-4 whitespace-nowrap">
                          {workoutScore ? (
                            <div className="text-sm">
                              <div className="font-medium text-text-primary">
                                {workoutScore.score ? workoutScore.score.toFixed(1) : '0.0'}
                              </div>
                              <div className="text-xs text-muted">Rank: {workoutScore.rank}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted">-</div>
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
            <p className="text-muted">No team scores submitted for this workout yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-high">
              <thead className="bg-surface-high">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface-low divide-y divide-surface-high">
                {workout.entries.map((entry) => (
                  <tr key={entry.teamId} className="hover:bg-surface-high">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getRankIcon(entry.rank)}</span>
                        <span className="text-sm font-medium text-text-primary">{entry.rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {entry.teamName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-bold text-text-primary">
                          {entry.score ? entry.score.toFixed(1) : '0.0'}
                        </div>
                        <div className="text-xs text-muted">
                          {entry.rawValue
                            ? formatRawValue(entry.rawValue, workout.activityId, entry.reps)
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
    <div className="panel rounded-lg">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-xl font-semibold text-text-primary">Leaderboard</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-text-secondary hover:border-border'
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
