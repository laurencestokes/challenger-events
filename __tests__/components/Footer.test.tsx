import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../../components/Footer';

describe('Footer', () => {
  it('renders copyright with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it('renders company number', () => {
    render(<Footer />);
    expect(screen.getByText(/16703228/)).toBeInTheDocument();
  });

  it('renders Terms of Service link', () => {
    render(<Footer />);
    const link = screen.getByText('Terms of Service');
    expect(link).toHaveAttribute('href', '/terms-of-service');
  });

  it('renders Privacy Policy link', () => {
    render(<Footer />);
    const link = screen.getByText('Privacy Policy');
    expect(link).toHaveAttribute('href', '/privacy-policy');
  });

  it('renders Cookie Policy link', () => {
    render(<Footer />);
    const link = screen.getByText('Cookie Policy');
    expect(link).toHaveAttribute('href', '/cookie-policy');
  });

  it('renders social media links with target="_blank"', () => {
    render(<Footer />);
    const facebook = screen.getByLabelText('Facebook');
    const instagram = screen.getByLabelText('Instagram');

    expect(facebook).toHaveAttribute('target', '_blank');
    expect(facebook).toHaveAttribute('rel', 'noopener noreferrer');
    expect(instagram).toHaveAttribute('target', '_blank');
    expect(instagram).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders version info', () => {
    render(<Footer />);
    // Version is either from env or fallback '0.1.0'
    expect(screen.getByText(/v\d+\.\d+\.\d+/)).toBeInTheDocument();
  });
});
