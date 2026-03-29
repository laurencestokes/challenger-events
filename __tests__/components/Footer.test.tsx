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

  it('renders Terms link', () => {
    render(<Footer />);
    const link = screen.getByText('Terms');
    expect(link).toHaveAttribute('href', '/terms-of-service');
  });

  it('renders Privacy link', () => {
    render(<Footer />);
    const link = screen.getByText('Privacy');
    expect(link).toHaveAttribute('href', '/privacy-policy');
  });

  it('renders Cookie link', () => {
    render(<Footer />);
    const link = screen.getByText('Cookies');
    expect(link).toHaveAttribute('href', '/cookie-policy');
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

  it('contains all content within the footer element', () => {
    render(<Footer />);
    const footer = document.querySelector('footer');
    expect(footer).toContainElement(screen.getByText('Terms'));
    expect(footer).toContainElement(screen.getByText('Privacy'));
    expect(footer).toContainElement(screen.getByText('Cookies'));
    expect(footer).toContainElement(screen.getByText(/16703228/));
    expect(footer).toContainElement(screen.getByText(/Version/));
  });

  it('has constrained width via container class', () => {
    render(<Footer />);
    const footer = document.querySelector('footer');
    expect(footer?.className).toContain('container');
  });
});
