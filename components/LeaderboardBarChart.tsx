'use client';

import React from 'react';

interface Activity {
  id: string;
  name: string;
}

interface WorkoutScore {
  score: number;
  rawValue: number;
  reps?: number;
  rank: number;
  activityName: string;
  scoringSystemId?: string;
}

interface LeaderboardEntry {
  userId?: string;
  teamId?: string;
  name: string;
  teamName?: string;
  totalScore: number;
  workoutScores: {
    [activityId: string]: WorkoutScore;
  };
  rank: number;
  teamLogoUrl?: string;
  logoUrl?: string;
}

interface TeamMember {
  userId: string;
  name: string;
  workoutScores: {
    [activityId: string]: WorkoutScore;
  };
  totalScore: number;
}

interface LeaderboardBarChartProps {
  entries: LeaderboardEntry[];
  activities: Activity[];
  maxScore: number;
  isTeamView: boolean;
  formatRawValue: (
    rawValue: number,
    activityId: string,
    reps?: number,
    scoringSystemId?: string,
  ) => string;
  teamMembers?: Map<string, TeamMember[]>;
}

// Color palette for activity segments - matches image description with enhanced shadows
const ACTIVITY_COLORS = [
  {
    bg: '#1e3a5f',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
    shadow: '0 4px 12px rgba(30, 58, 95, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  }, // Dark blue/grey
  {
    bg: '#dc2626',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    shadow: '0 4px 12px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  }, // Red
  {
    bg: '#9ca3af',
    gradient: 'linear-gradient(135deg, #9ca3af 0%, #d1d5db 100%)',
    shadow: '0 4px 12px rgba(156, 163, 175, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  }, // Light grey
  {
    bg: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    shadow: '0 4px 12px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  }, // Blue
  {
    bg: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    shadow: '0 4px 12px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  }, // Green
  {
    bg: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    shadow: '0 4px 12px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  }, // Yellow
  {
    bg: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    shadow: '0 4px 12px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  }, // Purple
];

// Get initials from name (e.g., "John Doe" -> "JD")
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function LeaderboardBarChart({
  entries,
  activities,
  maxScore,
  isTeamView,
  formatRawValue,
  teamMembers,
}: LeaderboardBarChartProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">No data available</p>
      </div>
    );
  }

  // Safety check for maxScore
  const safeMaxScore = maxScore > 0 ? maxScore : 1;

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        // Calculate segment widths
        const segments = activities
          .map((activity) => {
            const workoutScore = entry.workoutScores[activity.id];
            if (!workoutScore || workoutScore.score === 0) {
              return null;
            }
            return {
              activity,
              workoutScore,
              widthPercent: (workoutScore.score / safeMaxScore) * 100,
            };
          })
          .filter(Boolean) as Array<{
          activity: Activity;
          workoutScore: WorkoutScore;
          widthPercent: number;
        }>;

        // For team view, show member contributions within segments
        const memberSegments =
          isTeamView && teamMembers
            ? activities.map((activity) => {
                const members = teamMembers.get(entry.teamId || '') || [];
                const memberScores = members
                  .map((member) => {
                    const score = member.workoutScores[activity.id];
                    return score
                      ? {
                          member,
                          score: score.score,
                          rawValue: score.rawValue,
                          reps: score.reps,
                          scoringSystemId: score.scoringSystemId,
                          widthPercent: score.score > 0 ? (score.score / safeMaxScore) * 100 : 0,
                        }
                      : null;
                  })
                  .filter(Boolean)
                  .sort((a, b) => (b?.score || 0) - (a?.score || 0));

                return {
                  activity,
                  memberScores: memberScores as Array<{
                    member: TeamMember;
                    score: number;
                    rawValue: number;
                    reps?: number;
                    scoringSystemId?: string;
                    widthPercent: number;
                  }>,
                };
              })
            : [];

        return (
          <div
            key={entry.teamId || entry.userId || entry.name}
            className="bg-surface-low rounded-xl p-4 border border-surface-high/50 hover:border-border transition-colors"
          >
            <div className="flex items-center gap-4 mb-3">
              {/* Rank */}
              <div className="flex-shrink-0 w-12 text-center">
                <span className="text-lg font-semibold text-white">
                  {entry.rank === 1
                    ? '🥇'
                    : entry.rank === 2
                      ? '🥈'
                      : entry.rank === 3
                        ? '🥉'
                        : `#${entry.rank}`}
                </span>
              </div>

              {/* Team/Person Name - Fixed width for alignment */}
              <div className="flex-shrink-0 w-[180px]">
                <div className="text-sm font-medium text-white truncate">{entry.name}</div>
                {entry.teamName && !isTeamView && (
                  <div className="text-xs text-muted truncate">{entry.teamName}</div>
                )}
              </div>

              {/* Bar Chart */}
              <div className="flex-1 min-w-0">
                <div className="relative h-16 bg-carbon/50 rounded-lg overflow-hidden border border-surface-high/30">
                  {/* Bar segments */}
                  <div className="flex h-full items-stretch">
                    {isTeamView && memberSegments.length > 0
                      ? // Team view: Show member contributions within activity segments
                        memberSegments.map(({ activity, memberScores }, activityIndex) => {
                          if (memberScores.length === 0) return null;

                          const color = ACTIVITY_COLORS[activityIndex % ACTIVITY_COLORS.length];
                          const totalActivityScore = memberScores.reduce(
                            (sum, ms) => sum + ms.score,
                            0,
                          );
                          const segmentWidth = (totalActivityScore / safeMaxScore) * 100;

                          if (segmentWidth === 0) return null;

                          return (
                            <div
                              key={activity.id}
                              className="h-full relative group"
                              style={{
                                width: `${segmentWidth}%`,
                                minWidth: segmentWidth < 5 ? '5%' : undefined,
                              }}
                            >
                              {/* Rectangular segment */}
                              <div
                                className="h-full relative overflow-hidden"
                                style={{
                                  background: color.gradient,
                                  boxShadow: color.shadow,
                                  borderRight: '1px solid rgba(0, 0, 0, 0.2)',
                                }}
                              >
                                {/* Activity name label - only show if multiple activities */}
                                {activities.length > 1 && segmentWidth > 15 && (
                                  <div className="absolute top-1 left-1 text-white text-[10px] font-bold opacity-90 z-10 px-1">
                                    {activity.name}
                                  </div>
                                )}

                                {/* Member sub-segments */}
                                {memberScores.length > 1 && (
                                  <div className="flex h-full">
                                    {memberScores.map((ms, idx) => {
                                      const memberWidth = (ms.score / totalActivityScore) * 100;
                                      const memberColor =
                                        ACTIVITY_COLORS[
                                          (activityIndex * 3 + idx) % ACTIVITY_COLORS.length
                                        ];
                                      return (
                                        <div
                                          key={ms.member.userId}
                                          className="h-full border-r border-black/30 last:border-r-0 relative"
                                          style={{
                                            width: `${memberWidth}%`,
                                            background: memberColor.gradient,
                                            boxShadow: memberColor.shadow,
                                          }}
                                          title={`${ms.member.name}: ${ms.score.toFixed(1)}`}
                                        >
                                          {/* Member name for larger segments */}
                                          {memberWidth > 20 && (
                                            <div className="h-full flex flex-col items-center justify-center text-white px-1">
                                              <div className="text-[10px] font-bold opacity-90 leading-tight text-center">
                                                {ms.member.name.length > 12
                                                  ? ms.member.name.substring(0, 10) + '...'
                                                  : ms.member.name}
                                              </div>
                                              <div className="text-[9px] font-semibold opacity-75">
                                                {ms.score.toFixed(0)}
                                              </div>
                                            </div>
                                          )}
                                          {/* Member initials for medium segments */}
                                          {memberWidth > 10 && memberWidth <= 20 && (
                                            <div className="h-full flex flex-col items-center justify-center text-white px-1">
                                              <div className="text-[10px] font-bold opacity-90">
                                                {getInitials(ms.member.name)}
                                              </div>
                                              <div className="text-[9px] font-semibold opacity-75">
                                                {ms.score.toFixed(0)}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Single member or total activity score */}
                                {memberScores.length === 1 && segmentWidth > 10 && (
                                  <div className="h-full flex flex-col items-center justify-center text-white px-2 relative">
                                    {activities.length > 1 && (
                                      <div className="absolute top-1 left-1 text-[9px] font-bold opacity-90">
                                        {activity.name}
                                      </div>
                                    )}
                                    <div className="text-[10px] font-bold opacity-90 text-center">
                                      {memberScores[0].member.name.length > 15
                                        ? memberScores[0].member.name.substring(0, 13) + '...'
                                        : memberScores[0].member.name}
                                    </div>
                                    <div className="text-[9px] font-semibold opacity-75">
                                      {memberScores[0].score.toFixed(0)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Hover tooltip */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <div className="absolute top-full left-0 mt-1 bg-carbon text-white text-xs rounded px-2 py-1 whitespace-nowrap border border-surface-high shadow-lg">
                                  <div className="font-semibold">{activity.name}</div>
                                  {memberScores.map((ms) => (
                                    <div key={ms.member.userId} className="text-text-secondary">
                                      {ms.member.name}: {ms.score.toFixed(1)} (
                                      {formatRawValue(
                                        ms.rawValue,
                                        activity.id,
                                        ms.reps,
                                        ms.scoringSystemId,
                                      )}
                                      )
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      : // Individual view or simple team view: Show activity segments
                        segments.map(({ activity, workoutScore, widthPercent }, index) => {
                          if (widthPercent === 0) return null;

                          const color = ACTIVITY_COLORS[index % ACTIVITY_COLORS.length];

                          return (
                            <div
                              key={activity.id}
                              className="h-full relative group"
                              style={{
                                width: `${widthPercent}%`,
                                minWidth: widthPercent < 5 ? '5%' : undefined,
                              }}
                            >
                              {/* Rectangular segment */}
                              <div
                                className="h-full flex items-center justify-center relative overflow-hidden"
                                style={{
                                  background: color.gradient,
                                  boxShadow: color.shadow,
                                  borderRight: '1px solid rgba(0, 0, 0, 0.2)',
                                }}
                              >
                                {/* Activity name label - only show if multiple activities and segment is not large enough to show it in center */}
                                {activities.length > 1 &&
                                  widthPercent > 15 &&
                                  widthPercent <= 20 && (
                                    <div className="absolute top-1 left-1 text-white text-[10px] font-bold opacity-90 z-10 px-1">
                                      {activity.name}
                                    </div>
                                  )}

                                {/* Score display for medium segments */}
                                {widthPercent > 12 && widthPercent <= 20 && (
                                  <div className="text-white text-xs font-bold px-2 text-center">
                                    <div>{workoutScore.score.toFixed(0)}</div>
                                  </div>
                                )}

                                {/* Activity name and score for larger segments */}
                                {widthPercent > 20 && (
                                  <div className="text-white text-xs font-bold px-2 text-center flex flex-col items-center justify-center h-full">
                                    {activities.length > 1 && (
                                      <div className="text-[10px] opacity-90 mb-1">
                                        {activity.name}
                                      </div>
                                    )}
                                    <div className="text-xs">{workoutScore.score.toFixed(0)}</div>
                                  </div>
                                )}
                              </div>

                              {/* Hover tooltip */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <div className="absolute top-full left-0 mt-1 bg-carbon text-white text-xs rounded px-2 py-1 whitespace-nowrap border border-surface-high shadow-lg">
                                  <div className="font-semibold">{activity.name}</div>
                                  <div className="text-text-secondary">
                                    Score: {workoutScore.score.toFixed(1)}
                                  </div>
                                  <div className="text-muted">
                                    {formatRawValue(
                                      workoutScore.rawValue,
                                      activity.id,
                                      workoutScore.reps,
                                      workoutScore.scoringSystemId,
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                  </div>
                </div>
              </div>

              {/* Total Score - Glowing yellow style */}
              <div className="flex-shrink-0 w-24 text-right">
                <div
                  className="text-2xl font-bold text-yellow-400"
                  style={{
                    textShadow: '0 0 10px rgba(234, 179, 8, 0.5), 0 0 20px rgba(234, 179, 8, 0.3)',
                  }}
                >
                  {entry.totalScore.toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
