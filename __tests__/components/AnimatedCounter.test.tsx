import React from 'react';
import { render, screen } from '@testing-library/react';
import AnimatedCounter from '../../components/AnimatedCounter';

// Mock animejs
jest.mock('animejs', () => ({
  animate: jest.fn(),
  createScope: jest.fn(() => ({
    add: jest.fn().mockReturnThis(),
    revert: jest.fn(),
    methods: {},
  })),
}));

describe('AnimatedCounter', () => {
  it('displays the value', () => {
    render(<AnimatedCounter value={42} label="Score" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays the label', () => {
    render(<AnimatedCounter value={100} label="Points" />);
    expect(screen.getByText('Points')).toBeInTheDocument();
  });

  it('displays unit when provided', () => {
    render(<AnimatedCounter value={500} label="Distance" unit="meters" />);
    expect(screen.getByText('meters')).toBeInTheDocument();
  });

  it('does not display unit when not provided', () => {
    render(<AnimatedCounter value={500} label="Score" />);
    expect(screen.queryByText('meters')).not.toBeInTheDocument();
  });

  it('formats value with precision', () => {
    render(<AnimatedCounter value={42.567} label="Score" precision={2} />);
    expect(screen.getByText('42.57')).toBeInTheDocument();
  });

  it('formats value with 0 precision by default', () => {
    render(<AnimatedCounter value={42.567} label="Score" />);
    expect(screen.getByText('43')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<AnimatedCounter value={0} label="Test" className="my-custom" />);
    expect(container.firstChild).toHaveClass('my-custom');
  });

  it('applies size classes', () => {
    const { container: sm } = render(<AnimatedCounter value={0} label="T" size="sm" />);
    expect(sm.querySelector('.counter-value')?.className).toContain('text-2xl');

    const { container: xl } = render(<AnimatedCounter value={0} label="T" size="xl" />);
    expect(xl.querySelector('.counter-value')?.className).toContain('text-6xl');
  });
});
