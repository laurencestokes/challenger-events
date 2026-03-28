import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSwitch from '../../components/ThemeSwitch';

const mockSetTheme = jest.fn();
const mockTheme: { theme: string; resolvedTheme: string } = {
  theme: 'dark',
  resolvedTheme: 'dark',
};

jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockTheme.theme,
    resolvedTheme: mockTheme.resolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

describe('ThemeSwitch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTheme.theme = 'dark';
    mockTheme.resolvedTheme = 'dark';
  });

  it('renders a button with accessible label', () => {
    render(<ThemeSwitch />);
    expect(screen.getByLabelText('Toggle Dark Mode')).toBeInTheDocument();
  });

  it('switches to light when currently dark', () => {
    mockTheme.theme = 'dark';
    render(<ThemeSwitch />);
    fireEvent.click(screen.getByLabelText('Toggle Dark Mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('switches to dark when currently light', () => {
    mockTheme.theme = 'light';
    mockTheme.resolvedTheme = 'light';
    render(<ThemeSwitch />);
    fireEvent.click(screen.getByLabelText('Toggle Dark Mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('uses resolvedTheme as fallback', () => {
    mockTheme.theme = 'system';
    mockTheme.resolvedTheme = 'dark';
    render(<ThemeSwitch />);
    fireEvent.click(screen.getByLabelText('Toggle Dark Mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
