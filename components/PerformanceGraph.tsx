'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { EVENT_TYPES } from '@/constants/eventTypes';
import { useTheme } from 'next-themes';

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

export default function PerformanceGraph({ scores, isLoading }: PerformanceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [grouping, setGrouping] = useState<'all' | 'strength' | 'endurance' | 'activity'>('all');
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [chartKey, setChartKey] = useState(0); // Force re-render on resize
  useEffect(() => {
    setMounted(true);
  }, []);

  // Add resize listener for responsive chart
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && !isLoading && scores.length > 0) {
        // Force re-render by updating chart key
        setChartKey((prev) => prev + 1);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoading, scores.length]);

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
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? new Date() : date;
    }

    return new Date();
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

  // For All/Strength/Endurance: build a time series of total score over time
  const buildTotalScoreSeries = useCallback(
    (
      scores: Score[],
      category: 'all' | 'strength' | 'endurance',
      timeRange: '7d' | '30d' | '90d' | 'all',
    ) => {
      // 1. Sort all scores by date ascending
      const sorted = [...scores].sort(
        (a, b) => parseDate(a.submittedAt).getTime() - parseDate(b.submittedAt).getTime(),
      );
      // 2. For each date, keep a running best for each event type
      const bestByType: Record<string, number> = {};
      const points: { date: Date; total: number }[] = [];
      const now = new Date();
      const categoryIds =
        category === 'all'
          ? EVENT_TYPES.map((e) => e.id)
          : getEventTypeIdsForCategory(category === 'strength' ? 'STRENGTH' : 'ENDURANCE');
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
        // Update best for this event type
        if (!bestByType[activityId] || score.calculatedScore > bestByType[activityId]) {
          bestByType[activityId] = score.calculatedScore;
        }
        // Calculate total
        const total = categoryIds.reduce((sum, id) => sum + (bestByType[id] || 0), 0);
        points.push({ date, total });
      }
      // Remove duplicate dates (keep last point for each date)
      const uniquePoints: { date: Date; total: number }[] = [];
      let lastDate = '';
      for (const p of points) {
        const d = p.date.toISOString().split('T')[0];
        if (d !== lastDate) {
          uniquePoints.push(p);
          lastDate = d;
        } else {
          uniquePoints[uniquePoints.length - 1] = p;
        }
      }
      return uniquePoints;
    },
    [],
  );

  useEffect(() => {
    if (!mounted || !svgRef.current || isLoading || scores.length === 0) return;
    if (!theme && !resolvedTheme) return;

    console.log('Rendering chart with scores:', scores.length);

    // Detect dark mode using next-themes
    const isDark = theme === 'dark' || resolvedTheme === 'dark';
    const axisLabelColor = isDark ? '#E84C04' : '#334155'; // primary-500 or slate-700
    const axisTitleColor = isDark ? '#fff' : '#334155'; // white in dark mode, slate-700 in light
    const gridLineColor = isDark ? '#fff' : '#e5e7eb'; // white or gray-200
    console.log('PerformanceGraph dark mode detected:', isDark);

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    let filteredScores = scores;
    if (grouping === 'activity') {
      // Per-activity: filter as before
      const scoreActivityId = (score: Score) => score.testId || score.activityId;
      filteredScores = scores.filter((score) => {
        const isActivityMatch =
          selectedActivity === 'all' || scoreActivityId(score) === selectedActivity;
        if (!isActivityMatch) return false;
        const scoreDate = parseDate(score.submittedAt);
        const now = new Date();
        switch (timeRange) {
          case '7d':
            return scoreDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          case '30d':
            return scoreDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          case '90d':
            return scoreDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          case 'all':
          default:
            return true;
        }
      });
    }

    // Get container width for responsive chart
    const container = svgRef.current.parentElement;
    const containerWidth = container ? container.clientWidth : 800;

    // Chart dimensions - responsive to container width
    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = Math.max(containerWidth - margin.left - margin.right, 350); // Minimum width of 350px for mobile
    const height = 400 - margin.top - margin.bottom;

    console.log('Chart dimensions:', { width, height, containerWidth });

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('background', 'none'); // Remove default background for theming

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    if (grouping === 'activity') {
      // Per-activity: plot as before
      const filtered = filteredScores.sort(
        (a, b) => parseDate(a.submittedAt).getTime() - parseDate(b.submittedAt).getTime(),
      );
      const xScale = d3
        .scaleTime()
        .domain(d3.extent(filtered, (d) => parseDate(d.submittedAt)) as [Date, Date])
        .range([0, width]);
      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(filtered, (d) => d.calculatedScore) as number])
        .range([height, 0]);
      const line = d3
        .line<Score>()
        .x((d) => xScale(parseDate(d.submittedAt)))
        .y((d) => yScale(d.calculatedScore))
        .curve(d3.curveMonotoneX);
      g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickSize(-height)
            .tickFormat(() => ''),
        )
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.2)
        .selectAll('line')
        .style('stroke', gridLineColor);
      g.append('g')
        .attr('class', 'grid')
        .call(
          d3
            .axisLeft(yScale)
            .tickSize(-width)
            .tickFormat(() => ''),
        )
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.2)
        .selectAll('line')
        .style('stroke', gridLineColor);
      g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b %d, %Y') as unknown as null))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)')
        .style('fill', axisLabelColor);
      g.append('g')
        .call(d3.axisLeft(yScale).tickFormat((d) => d.toString()))
        .selectAll('text')
        .style('fill', axisLabelColor);
      g.append('path')
        .datum(filtered)
        .attr('fill', 'none')
        .attr('stroke', '#E84C04') // Tailwind primary-500 (main theme orange)
        .attr('stroke-width', 3)
        .attr('d', line);
      // Always append axis titles with correct color
      g.selectAll('text.axis-title').remove();
      g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .attr('class', 'axis-title')
        .attr('fill', axisTitleColor)
        .style('fill', axisTitleColor)
        .text('Date');
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .attr('class', 'axis-title')
        .attr('fill', axisTitleColor)
        .style('fill', axisTitleColor)
        .text('Challenger Score');
      g.selectAll('.dot')
        .data(filtered)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', (d) => xScale(parseDate(d.submittedAt)))
        .attr('cy', (d) => yScale(d.calculatedScore))
        .attr('r', 5)
        .attr('fill', (d) => (d.verified ? '#10b981' : '#f59e0b'))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function (_event, d) {
          d3.selectAll('.tooltip').remove();
          const tooltip = d3
            .select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)')
            .style('border', '1px solid rgba(255, 255, 255, 0.1)')
            .style('max-width', '250px')
            .style('white-space', 'nowrap');
          tooltip.html(`
            <div style="font-weight: 600; margin-bottom: 4px; color: #F97316;">${getActivityName(d.testId || d.activityId)}</div>
            <div style="margin-bottom: 2px;"><span style="color: #9ca3af;">Score:</span> <span style="font-weight: 600; color: #10b981;">${d.calculatedScore}</span></div>
            <div style="margin-bottom: 2px;"><span style="color: #9ca3af;">Raw:</span> ${formatRawValue(d.rawValue, d.testId || d.activityId, d.reps)}</div>
            <div style="margin-bottom: 2px;"><span style="color: #9ca3af;">Date:</span> <span style="color: #F97316; font-weight: 600;">${parseDate(d.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
            ${d.event ? `<div style=\"margin-bottom: 2px;\"><span style=\"color: #9ca3af;\">Event:</span> ${d.event.name}</div>` : ''}
            ${d.verified ? '<div style="color: #10b981; font-weight: 600;">✅ Verified</div>' : '<div style="color: #f59e0b;">⚠️ Unverified</div>'}
          `);
          // Position tooltip just above the data point, centered
          if (!svgRef.current) return;
          const svgRect = svgRef.current.getBoundingClientRect();
          const cx = xScale(parseDate(d.submittedAt)) + margin.left;
          const cy = yScale(d.calculatedScore) + margin.top;
          const tooltipNode = tooltip.node();
          if (tooltipNode) {
            const tooltipRect = tooltipNode.getBoundingClientRect();
            const left = svgRect.left + cx - tooltipRect.width / 2;
            const top = svgRect.top + cy - tooltipRect.height - 12; // 12px above the point
            tooltip.style('left', `${left}px`).style('top', `${top}px`);
          }
          d3.select(this).attr('r', 8);
        })
        .on('mouseout', function () {
          d3.selectAll('.tooltip').remove();
          d3.select(this).attr('r', 5);
        });
      return;
    }

    // All/Strength/Endurance: build and plot total score series
    const series = buildTotalScoreSeries(scores, grouping, timeRange);
    if (series.length === 0) return;
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(series, (d) => d.date) as [Date, Date])
      .range([0, width]);
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(series, (d) => d.total) as number])
      .range([height, 0]);
    const line = d3
      .line<{ date: Date; total: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.total))
      .curve(d3.curveMonotoneX);
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-height)
          .tickFormat(() => ''),
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.2)
      .selectAll('line')
      .style('stroke', gridLineColor);
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(() => ''),
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.2)
      .selectAll('line')
      .style('stroke', gridLineColor);
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b %d, %Y') as unknown as null))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('fill', axisLabelColor);
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat((d) => d.toString()))
      .selectAll('text')
      .style('fill', axisLabelColor);
    g.append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#E84C04') // Tailwind primary-500 (main theme orange)
      .attr('stroke-width', 3)
      .attr('d', line);
    g.selectAll('.dot')
      .data(series)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.total))
      .attr('r', 5)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.selectAll('.tooltip').remove();
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.9)')
          .style('color', 'white')
          .style('padding', '12px')
          .style('border-radius', '8px')
          .style('font-size', '13px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)')
          .style('border', '1px solid rgba(255, 255, 255, 0.1)')
          .style('max-width', '250px')
          .style('white-space', 'nowrap');
        tooltip.html(`
          <div style="font-weight: 600; margin-bottom: 4px; color: #3b82f6;">${grouping === 'all' ? 'Total Challenger Score' : grouping === 'strength' ? 'Strength Score' : 'Endurance Score'}</div>
          <div style="margin-bottom: 2px;"><span style="color: #9ca3af;">Total:</span> <span style="font-weight: 600; color: #3b82f6;">${d.total}</span></div>
          <div style="margin-bottom: 2px;"><span style="color: #9ca3af;">Date:</span> ${d.date.toLocaleDateString()}</div>
        `);
        const tooltipNode = tooltip.node();
        if (tooltipNode) {
          const tooltipRect = tooltipNode.getBoundingClientRect();
          const mouseX = event.clientX;
          const mouseY = event.clientY;
          let left = mouseX + 10;
          let top = mouseY - tooltipRect.height - 10;
          if (left + tooltipRect.width > window.innerWidth) {
            left = mouseX - tooltipRect.width - 10;
          }
          if (top < 0) {
            top = mouseY + 10;
          }
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        }
        d3.select(this).attr('r', 8);
      })
      .on('mouseout', function () {
        d3.selectAll('.tooltip').remove();
        d3.select(this).attr('r', 5);
      });
    // Always append axis titles with correct color
    g.selectAll('text.axis-title').remove();
    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .attr('class', 'axis-title')
      .attr('fill', axisTitleColor)
      .style('fill', axisTitleColor)
      .text('Date');
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .attr('class', 'axis-title')
      .attr('fill', axisTitleColor)
      .style('fill', axisTitleColor)
      .text('Challenger Score');

    console.log('Chart rendering complete');
  }, [
    scores,
    selectedActivity,
    timeRange,
    isLoading,
    grouping,
    theme,
    resolvedTheme,
    mounted,
    chartKey,
    buildTotalScoreSeries,
  ]);

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

  if (!mounted) {
    return null;
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

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Verified Scores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>Unverified Scores</span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full overflow-x-auto border border-gray-700/50 rounded-xl p-4 bg-black/30">
        <div className="min-w-[450px] w-full">
          <svg ref={svgRef} className="w-full h-[400px]"></svg>
        </div>
      </div>
    </div>
  );
}
