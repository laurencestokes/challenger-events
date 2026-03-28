import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InfoIcon from '../../components/InfoIcon';

describe('InfoIcon', () => {
  it('renders the "i" icon', () => {
    render(<InfoIcon tooltip="Some help text" />);
    expect(screen.getByText('i')).toBeInTheDocument();
  });

  it('does not show tooltip by default', () => {
    render(<InfoIcon tooltip="Hidden tooltip" />);
    expect(screen.queryByText('Hidden tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover', () => {
    render(<InfoIcon tooltip="Visible tooltip" />);
    const icon = screen.getByText('i').closest('div[class*="cursor-help"]');
    fireEvent.mouseEnter(icon!);
    expect(screen.getByText('Visible tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    render(<InfoIcon tooltip="Fleeting tooltip" />);
    const icon = screen.getByText('i').closest('div[class*="cursor-help"]');
    fireEvent.mouseEnter(icon!);
    expect(screen.getByText('Fleeting tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(icon!);
    expect(screen.queryByText('Fleeting tooltip')).not.toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<InfoIcon tooltip="Test" className="custom-info" />);
    const icon = screen.getByText('i').closest('div[class*="cursor-help"]');
    expect(icon?.className).toContain('custom-info');
  });
});
