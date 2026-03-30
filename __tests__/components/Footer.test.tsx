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

  it('renders Instagram link with target blank', () => {
    render(<Footer />);
    const link = screen.getByLabelText('Instagram');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders version info', () => {
    render(<Footer />);
    expect(screen.getByText(/Version/)).toBeInTheDocument();
  });

  it('renders inside a footer element', () => {
    render(<Footer />);
    const footer = document.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('renders the page break divider', () => {
    render(<Footer />);
    const pageBreak = document.querySelector('.page-break');
    expect(pageBreak).toBeInTheDocument();
  });
});
