import React from 'react';
import { render, screen } from '@testing-library/react';
import ErgSpeedometer from '../../components/ErgSpeedometer';

jest.mock('animejs', () => ({
  animate: jest.fn(),
  createScope: jest.fn(() => ({
    add: jest.fn().mockReturnThis(),
    revert: jest.fn(),
    methods: {},
  })),
}));

// Mock AnimatedCounter to avoid animejs scope issues in child
jest.mock('../../components/AnimatedCounter', () => {
  return function MockAnimatedCounter({ value, label, unit, precision }: any) {
    return (
      <div data-testid="animated-counter">
        <span>{precision != null ? Number(value).toFixed(precision) : value}</span>
        <span>{label}</span>
        {unit && <span>{unit}</span>}
      </div>
    );
  };
});

describe('ErgSpeedometer', () => {
  const defaultProps = {
    name: 'Alice',
    age: 25,
    sex: 'female' as const,
    weight: 65,
    score: 450,
    accentColor: '#3b82f6',
    textColor: 'text-blue-400',
  };

  it('renders competitor name', () => {
    render(<ErgSpeedometer {...defaultProps} />);
    expect(screen.getByText(/ALICE/i)).toBeInTheDocument();
  });

  it('renders score via AnimatedCounter', () => {
    render(<ErgSpeedometer {...defaultProps} />);
    expect(screen.getByText('450')).toBeInTheDocument();
  });

  it('renders CHALLENGER SCORE label', () => {
    const { container } = render(<ErgSpeedometer {...defaultProps} />);
    expect(container.textContent).toContain('CHALLENGER SCORE');
  });

  it('renders DISTANCE label', () => {
    const { container } = render(<ErgSpeedometer {...defaultProps} />);
    expect(container.textContent).toContain('DISTANCE');
  });

  it('renders in compact mode', () => {
    const { container } = render(<ErgSpeedometer {...defaultProps} compact={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with zero score', () => {
    const { container } = render(<ErgSpeedometer {...defaultProps} score={0} />);
    expect(container.textContent).toContain('0');
  });

  it('renders in wideLayout mode', () => {
    const { container } = render(<ErgSpeedometer {...defaultProps} wideLayout={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with showTeamScore prop', () => {
    const { container } = render(
      <ErgSpeedometer {...defaultProps} teamScore={1200} showTeamScore={true} />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with all metrics', () => {
    const { container } = render(
      <ErgSpeedometer
        {...defaultProps}
        pace={120}
        power={250}
        distance={500}
        heartRate={165}
        strokeRate={28}
        calories={350}
        distanceLabel="REMAINING"
      />,
    );
    const text = container.textContent || '';
    expect(text).toContain('250');
    expect(text).toContain('165');
    expect(text).toContain('28');
    expect(text).toContain('350');
    expect(text).toContain('REMAINING');
  });

  it('renders compact with metrics', () => {
    const { container } = render(
      <ErgSpeedometer
        {...defaultProps}
        compact={true}
        pace={90}
        power={200}
        distance={300}
        heartRate={150}
        strokeRate={25}
        calories={200}
      />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
