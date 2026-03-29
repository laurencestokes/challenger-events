import React from 'react';
import { render, screen } from '@testing-library/react';
import PerformanceGraph from '../../components/PerformanceGraph';

// Mock recharts to avoid canvas/SVG issues in jsdom
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

describe('PerformanceGraph', () => {
  const scores = [
    {
      id: 's1',
      activityId: 'squat',
      rawValue: 140,
      calculatedScore: 450,
      verified: true,
      submittedAt: '2026-01-15',
      reps: 1,
      notes: '',
    },
    {
      id: 's2',
      activityId: 'bench',
      rawValue: 100,
      calculatedScore: 380,
      verified: true,
      submittedAt: '2026-02-10',
      reps: 1,
      notes: '',
    },
    {
      id: 's3',
      activityId: 'squat',
      rawValue: 150,
      calculatedScore: 500,
      verified: false,
      submittedAt: '2026-03-01',
      reps: 1,
      notes: '',
    },
  ];

  it('renders the chart container', () => {
    render(<PerformanceGraph scores={scores} isLoading={false} />);
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
  });

  it('renders filter controls', () => {
    render(<PerformanceGraph scores={scores} isLoading={false} />);
    // Time range buttons/selectors should exist
    expect(screen.getByText(/30d|30 days/i)).toBeInTheDocument();
  });

  it('renders with empty scores without crashing', () => {
    const { container } = render(<PerformanceGraph scores={[]} isLoading={false} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders activity filter', () => {
    render(<PerformanceGraph scores={scores} isLoading={false} />);
    // Should have an "All" option for activity filter
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
  });
});
