'use client';

import { useMemo, useState } from 'react';
import { EVENT_TYPES } from '@/constants/eventTypes';
import { useTheme } from 'next-themes';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface Score {
  id: string;
  activityId: string;
  testId?: string;
  rawValue: number;
  calculatedScore: number;
  reps?: number;
  notes?: string;
  verified: boolean;
  submittedAt: unknown;
  eventId?: string | null;
  workoutName?: string;
  event?: {
    name: string;
  };
}

interface PerformanceGraphProps {
  scores: Score[];
  isLoading: boolean;
}

export default function PerformanceGraph({ scores }: PerformanceGraphProps) {
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [grouping, setGrouping] = useState<'all' | 'strength' | 'endurance' | 'activity'>('all');
  const { theme, resolvedTheme } = useTheme();

  const isDark = theme === 'dark' || resolvedTheme === 'dark';

  // Helper function to parse dates properly
  const parseDate = (dateValue: unknown): Date => {
    if (!dateValue) return new Date();

    // Handle Firestore Timestamp objects
    if (typeof dateValue === 'object' && dateValue !== null) {
      // Check if it's a Firestore Timestamp with seconds and nanoseconds
      if (
        'seconds' in dateValue &&
        typeof (dateValue as { seconds: number }).seconds === 'number'
      ) {
        return new Date((dateValue as { seconds: number }).seconds * 1000);
      } else if (
        'toDate' in dateValue &&
        typeof (dateValue as { toDate: () => Date }).toDate === 'function'
      ) {
        return (dateValue as { toDate: () => Date }).toDate();
      }
    }

    // Handle regular Date objects
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // Handle string dates
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? new Date() : date;
    }

    // Handle number timestamps
    if (typeof dateValue === 'number') {
      // Heuristic: treat < 1e12 as seconds, otherwise ms
      const ms = dateValue < 1e12 ? dateValue * 1000 : dateValue;
      const date = new Date(ms);
      return isNaN(date.getTime()) ? new Date() : date;
    }

    return new Date();
  };

  // Local date key (avoid UTC shifting from toISOString)
  const toLocalDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get unique activities for filter
  const activities = Array.from(new Set(scores.map((score) => score.testId || score.activityId)));
  const activityNames = activities.map((id) => ({
    id,
    name: getActivityName(id),
  }));

  function getActivityName(activityId: string): string {
    const activityMap: Record<string, string> = {
      squat: 'Squat',
      bench: 'Bench Press',
      deadlift: 'Deadlift',
      rowing_500m: '500m Row',
      rowing_4min: '4min Row',
      bike_4km: '4km Bike',
      ski_500m: '500m Ski',
    };
    return activityMap[activityId] || activityId;
  }

  // Helper: get all event type ids for a category
  function getEventTypeIdsForCategory(category: 'STRENGTH' | 'ENDURANCE') {
    return EVENT_TYPES.filter((e) => e.category === category).map((e) => e.id);
  }

  // Data builders for Recharts
  const totalSeries = useMemo(() => {
    if (scores.length === 0) return [] as { date: string; total: number; verified: number }[];
    const sorted = [...scores].sort(
      (a, b) => parseDate(a.submittedAt).getTime() - parseDate(b.submittedAt).getTime(),
    );
    const bestByTypeAll: Record<string, number> = {};
    const bestByTypeVerified: Record<string, number> = {};
    const points: { date: string; total: number; verified: number }[] = [];
    const now = new Date();
    const categoryIds =
      grouping === 'all'
        ? EVENT_TYPES.map((e) => e.id)
        : getEventTypeIdsForCategory(grouping === 'strength' ? 'STRENGTH' : 'ENDURANCE');
    for (const score of sorted) {
      const activityId = score.testId || score.activityId;
      if (!categoryIds.includes(activityId)) continue;
      const date = parseDate(score.submittedAt);
      // Time range filter
      switch (timeRange) {
        case '7d':
          if (date < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) continue;
          break;
        case '30d':
          if (date < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) continue;
          break;
        case '90d':
          if (date < new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)) continue;
          break;
      }
      // Update best for all
      if (!bestByTypeAll[activityId] || score.calculatedScore > bestByTypeAll[activityId]) {
        bestByTypeAll[activityId] = score.calculatedScore;
      }
      // Update best for verified-only
      const isVerified = !!(score.verified || score.eventId);
      if (isVerified) {
        if (
          !bestByTypeVerified[activityId] ||
          score.calculatedScore > bestByTypeVerified[activityId]
        ) {
          bestByTypeVerified[activityId] = score.calculatedScore;
        }
      }
      // Compute averages
      const sumAll = categoryIds.reduce((sum, id) => sum + (bestByTypeAll[id] || 0), 0);
      const sumVerified = categoryIds.reduce((sum, id) => sum + (bestByTypeVerified[id] || 0), 0);
      const denom = categoryIds.length || 1;
      const avgAll = Math.round(sumAll / denom);
      const avgVerified = Math.round(sumVerified / denom);
      points.push({ date: toLocalDateKey(date), total: avgAll, verified: avgVerified });
    }
    // Collapse same-date points keeping last
    const collapsed: Record<string, { total: number; verified: number }> = {};
    points.forEach((p) => (collapsed[p.date] = { total: p.total, verified: p.verified }));
    return Object.entries(collapsed).map(([date, vals]) => ({ date, ...vals }));
  }, [scores, grouping, timeRange]);

  const activitySeries = useMemo(() => {
    if (scores.length === 0)
      return [] as {
        date: string;
        score: number;
        verified: boolean;
        name?: string;
        rawValue?: number;
        reps?: number;
        activityId?: string;
      }[];
    const filtered = scores.filter((s) => {
      const id = s.testId || s.activityId;
      if (selectedActivity !== 'all' && id !== selectedActivity) return false;
      const date = parseDate(s.submittedAt);
      const now = new Date();
      switch (timeRange) {
        case '7d':
          return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d':
          return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case '90d':
          return date >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        case 'all':
        default:
          return true;
      }
    });
    // Deduplicate identical visual points while preserving Score History semantics
    // Keyed by (activityId, local day, rawValue if available else rounded score)
    const pick = new Map<string, (typeof filtered)[number]>();
    for (const s of filtered) {
      const d = parseDate(s.submittedAt);
      const day = toLocalDateKey(d);
      const activity = s.testId || s.activityId;
      const rv = (s as unknown as { rawValue?: number }).rawValue;
      const metric =
        typeof rv === 'number' && !isNaN(rv)
          ? `raw:${Math.round(rv * 1000) / 1000}`
          : `score:${Math.round((s.calculatedScore ?? 0) * 10) / 10}`;
      const key = `${activity}|${day}|${metric}`;
      const prev = pick.get(key);
      if (!prev) {
        pick.set(key, s);
      } else {
        // Prefer verified, then later timestamp
        const prevVerified = !!(prev.verified || prev.eventId);
        const currVerified = !!(s.verified || s.eventId);
        if (currVerified && !prevVerified) {
          pick.set(key, s);
        } else if (currVerified === prevVerified) {
          if (parseDate(s.submittedAt).getTime() > parseDate(prev.submittedAt).getTime()) {
            pick.set(key, s);
          }
        }
      }
    }

    const compact = Array.from(pick.values());

    const sorted = compact.sort(
      (a, b) => parseDate(a.submittedAt).getTime() - parseDate(b.submittedAt).getTime(),
    );
    return sorted.map((s) => ({
      date: toLocalDateKey(parseDate(s.submittedAt)),
      score: s.calculatedScore,
      verified: !!(s.verified || s.eventId),
      name: s.event?.name,
      rawValue: (s as unknown as { rawValue?: number }).rawValue,
      reps: (s as unknown as { reps?: number }).reps,
      activityId: s.testId || s.activityId,
    }));
  }, [scores, selectedActivity, timeRange]);

  // Build wide series for "all activities" -> one line per activity
  const activitySeriesWide = useMemo(() => {
    if (selectedActivity !== 'all')
      return { data: [] as Array<Record<string, unknown>>, keys: [] as string[] };
    // dates in ascending order with per-activity values
    const byDate: Record<string, Record<string, unknown>> = {};
    const keys = new Set<string>();
    activitySeries.forEach((p) => {
      const key = p.activityId as string;
      if (!key) return;
      keys.add(key);
      if (!byDate[p.date]) byDate[p.date] = { date: p.date } as Record<string, unknown>;
      (byDate[p.date] as Record<string, unknown>)[key] = p.score;
    });
    const data = Object.values(byDate).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return { data, keys: Array.from(keys) };
  }, [activitySeries, selectedActivity]);

  function formatRawValue(rawValue: number, activityId: string, reps?: number): string {
    // Import the beautifyRawScore function logic here
    if (['squat', 'bench', 'deadlift'].includes(activityId)) {
      const repsToShow = reps || 1;
      return `${rawValue}kg × ${repsToShow}`;
    }
    if (['rowing_500m', 'bike_4km', 'ski_500m'].includes(activityId)) {
      const minutes = Math.floor(rawValue / 60);
      const remainingSeconds = rawValue % 60;
      const milliseconds = Math.round((remainingSeconds % 1) * 10);
      const wholeSeconds = Math.floor(remainingSeconds);
      if (minutes > 0) {
        return `${minutes}:${wholeSeconds.toString().padStart(2, '0')}.${milliseconds} (mm:ss.ms)`;
      } else {
        return `${wholeSeconds}.${milliseconds} (ss.ms)`;
      }
    }
    if (activityId === 'rowing_4min') {
      return `${Math.round(rawValue)}m`;
    }
    return rawValue.toString();
  }

  if (scores.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">
          No performance data available yet. Start adding scores to see your progress!
        </p>
      </div>
    );
  }

  // Custom tooltips
  const ActivityTooltip = ({ active, payload }: { active?: boolean; payload?: unknown[] }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = (
      payload[0] as {
        payload: {
          score: number;
          rawValue?: number;
          reps?: number;
          activityId?: string;
          name?: string;
          date: string;
          verified: boolean;
        };
      }
    )?.payload;
    return (
      <div
        className="pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: 12,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, color: '#F97316' }}>
          {getActivityName(p.activityId || '')}
        </div>
        <div style={{ marginBottom: 2 }}>
          <span style={{ color: '#9ca3af' }}>Score:</span>{' '}
          <span style={{ fontWeight: 600, color: '#10b981' }}>{p.score}</span>
        </div>
        {typeof p.rawValue === 'number' && (
          <div style={{ marginBottom: 2 }}>
            <span style={{ color: '#9ca3af' }}>Raw:</span>{' '}
            {formatRawValue(p.rawValue, p.activityId || '', p.reps)}
          </div>
        )}
        <div style={{ marginBottom: 2 }}>
          <span style={{ color: '#9ca3af' }}>Date:</span>{' '}
          <span style={{ color: '#F97316', fontWeight: 600 }}>
            {new Date(p.date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <div style={{ color: p.verified ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
          {p.verified ? '✅ Verified' : '⚠️ Unverified'}
        </div>
      </div>
    );
  };

  const SeriesTooltip = ({ active, payload }: { active?: boolean; payload?: unknown[] }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = (payload[0] as { payload: { total: number; verified?: number; date: string } })
      ?.payload;
    const titleBase =
      grouping === 'all'
        ? 'Total Challenger Score'
        : grouping === 'strength'
          ? 'Strength Score'
          : 'Endurance Score';
    return (
      <div
        className="pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: 12,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{ fontWeight: 600, marginBottom: 4, color: '#F97316' }}
        >{`${titleBase} (Average)`}</div>
        <div style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: '#E84C04',
              display: 'inline-block',
            }}
          />
          <span>Total:</span>
          <span style={{ fontWeight: 600, color: '#E84C04' }}>{p.total}</span>
        </div>
        {typeof p.verified === 'number' && (
          <div style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 9999,
                background: '#3b82f6',
                display: 'inline-block',
              }}
            />
            <span>Verified:</span>
            <span style={{ fontWeight: 600, color: '#3b82f6' }}>{p.verified}</span>
          </div>
        )}
        <div style={{ marginTop: 2 }}>
          <span style={{ color: '#9ca3af' }}>Date:</span> {new Date(p.date).toLocaleDateString()}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <select
            value={grouping}
            onChange={(e) =>
              setGrouping(e.target.value as 'all' | 'strength' | 'endurance' | 'activity')
            }
            className="px-3 py-2 border border-primary-500/50 rounded-lg bg-gray-800 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All (Total Score)</option>
            <option value="strength">Strength Only</option>
            <option value="endurance">Endurance Only</option>
            <option value="activity">Per-activity</option>
          </select>
          {grouping === 'activity' && (
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Activities</option>
              {activityNames.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                timeRange === range
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range === '7d'
                ? '7 Days'
                : range === '30d'
                  ? '30 Days'
                  : range === '90d'
                    ? '90 Days'
                    : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend removed per request */}

      {/* Chart */}
      <div className="w-full overflow-x-auto border border-gray-700/50 rounded-xl p-4 bg-black/30">
        <div className="min-w-[450px] w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {grouping === 'activity' && selectedActivity !== 'all' ? (
              <LineChart data={activitySeries} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#ffffff33' : '#e5e7eb'} />
                <XAxis dataKey="date" tick={{ fill: isDark ? '#F97316' : '#334155' }} />
                <YAxis tick={{ fill: isDark ? '#F97316' : '#334155' }} />
                <Tooltip content={<ActivityTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Score"
                  stroke="#E84C04"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            ) : grouping === 'activity' && selectedActivity === 'all' ? (
              <LineChart
                data={activitySeriesWide.data}
                margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#ffffff33' : '#e5e7eb'} />
                <XAxis dataKey="date" tick={{ fill: isDark ? '#F97316' : '#334155' }} />
                <YAxis tick={{ fill: isDark ? '#F97316' : '#334155' }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.9)',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                  labelStyle={{ color: '#F97316' }}
                />
                {activitySeriesWide.keys.map((k, idx) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={getActivityName(k)}
                    stroke={
                      ['#E84C04', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#22d3ee'][
                        idx % 7
                      ]
                    }
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            ) : (
              <LineChart data={totalSeries} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#ffffff33' : '#e5e7eb'} />
                <XAxis dataKey="date" tick={{ fill: isDark ? '#F97316' : '#334155' }} />
                <YAxis tick={{ fill: isDark ? '#F97316' : '#334155' }} />
                <Tooltip content={<SeriesTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name={`${grouping === 'all' ? 'Total' : grouping === 'strength' ? 'Strength' : 'Endurance'} (Avg)`}
                  stroke="#E84C04"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="verified"
                  name={`${grouping === 'all' ? 'Verified Total' : grouping === 'strength' ? 'Verified Strength' : 'Verified Endurance'} (Avg)`}
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
