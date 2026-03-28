import React from 'react';
import { render, screen } from '@testing-library/react';
import LeaderboardBarChart from '../../components/LeaderboardBarChart';

describe('LeaderboardBarChart', () => {
  const activities = [
    { id: 'act1', name: 'Back Squat' },
    { id: 'act2', name: '500m Row' },
  ];

  const entries = [
    {
      userId: 'u1',
      name: 'Alice',
      totalScore: 900,
      workoutScores: {
        act1: { score: 500, rawValue: 140, rank: 1, activityName: 'Back Squat' },
        act2: { score: 400, rawValue: 90, rank: 1, activityName: '500m Row' },
      },
      rank: 1,
    },
    {
      userId: 'u2',
      name: 'Bob',
      totalScore: 750,
      workoutScores: {
        act1: { score: 400, rawValue: 120, rank: 2, activityName: 'Back Squat' },
        act2: { score: 350, rawValue: 95, rank: 2, activityName: '500m Row' },
      },
      rank: 2,
    },
  ];

  const formatRawValue = (rawValue: number) => `${rawValue}`;

  it('renders competitor names', () => {
    render(
      <LeaderboardBarChart
        entries={entries}
        activities={activities}
        maxScore={1000}
        isTeamView={false}
        formatRawValue={formatRawValue}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders total scores', () => {
    render(
      <LeaderboardBarChart
        entries={entries}
        activities={activities}
        maxScore={1000}
        isTeamView={false}
        formatRawValue={formatRawValue}
      />,
    );
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument();
  });

  it('renders rank numbers', () => {
    render(
      <LeaderboardBarChart
        entries={entries}
        activities={activities}
        maxScore={1000}
        isTeamView={false}
        formatRawValue={formatRawValue}
      />,
    );
    // Rank 1 and 2 should appear
    const { container } = render(
      <LeaderboardBarChart
        entries={entries}
        activities={activities}
        maxScore={1000}
        isTeamView={false}
        formatRawValue={formatRawValue}
      />,
    );
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
  });

  it('renders with empty entries', () => {
    const { container } = render(
      <LeaderboardBarChart
        entries={[]}
        activities={activities}
        maxScore={1000}
        isTeamView={false}
        formatRawValue={formatRawValue}
      />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders in team view mode', () => {
    const teamEntries = entries.map((e) => ({
      ...e,
      teamId: `t${e.rank}`,
      teamName: `Team ${e.rank}`,
    }));
    const { container } = render(
      <LeaderboardBarChart
        entries={teamEntries}
        activities={activities}
        maxScore={1000}
        isTeamView={true}
        formatRawValue={formatRawValue}
      />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with many activities', () => {
    const manyActivities = [
      { id: 'a1', name: 'Squat' },
      { id: 'a2', name: 'Bench' },
      { id: 'a3', name: 'Deadlift' },
      { id: 'a4', name: 'Row' },
      { id: 'a5', name: 'Bike' },
    ];
    const manyEntries = [
      {
        userId: 'u1',
        name: 'Alice',
        totalScore: 2500,
        workoutScores: {
          a1: { score: 500, rawValue: 140, rank: 1, activityName: 'Squat' },
          a2: { score: 400, rawValue: 100, rank: 1, activityName: 'Bench' },
          a3: { score: 600, rawValue: 200, rank: 1, activityName: 'Deadlift' },
          a4: { score: 500, rawValue: 90, rank: 1, activityName: 'Row' },
          a5: { score: 500, rawValue: 300, rank: 1, activityName: 'Bike' },
        },
        rank: 1,
      },
    ];
    const { container } = render(
      <LeaderboardBarChart
        entries={manyEntries}
        activities={manyActivities}
        maxScore={3000}
        isTeamView={false}
        formatRawValue={formatRawValue}
      />,
    );
    expect(container.textContent).toContain('2500');
  });

  it('renders team members when provided', () => {
    const teamEntries = [
      {
        teamId: 't1',
        name: 'Team Alpha',
        teamName: 'Team Alpha',
        totalScore: 900,
        workoutScores: {
          act1: { score: 500, rawValue: 140, rank: 1, activityName: 'Squat' },
        },
        rank: 1,
      },
    ];
    const teamMembers = new Map([
      [
        't1',
        [
          {
            userId: 'u1',
            name: 'Alice',
            workoutScores: { act1: { score: 500, rawValue: 140, rank: 1, activityName: 'Squat' } },
            totalScore: 500,
          },
        ],
      ],
    ]);
    const { container } = render(
      <LeaderboardBarChart
        entries={teamEntries}
        activities={activities}
        maxScore={1000}
        isTeamView={true}
        formatRawValue={formatRawValue}
        teamMembers={teamMembers}
      />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
