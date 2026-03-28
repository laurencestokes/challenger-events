import React from 'react';
import { render, screen } from '@testing-library/react';
import WelcomeSection from '../../components/WelcomeSection';

const mockAuth = { user: null as any };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('WelcomeSection', () => {
  beforeEach(() => {
    mockAuth.user = { name: 'John Doe', email: 'john@test.com', role: 'COMPETITOR' };
  });

  it('shows welcome message', () => {
    render(<WelcomeSection />);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('displays user name', () => {
    render(<WelcomeSection />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays first letter avatar', () => {
    render(<WelcomeSection />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('falls back to email when name is missing', () => {
    mockAuth.user = { email: 'jane@test.com', role: 'COMPETITOR' };
    render(<WelcomeSection />);
    expect(screen.getByText('jane@test.com')).toBeInTheDocument();
  });

  it('shows ADMIN badge for admin users', () => {
    mockAuth.user = { name: 'Admin', role: 'ADMIN' };
    render(<WelcomeSection />);
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('does not show ADMIN badge for competitors', () => {
    render(<WelcomeSection />);
    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();
  });

  it('does not show metrics by default', () => {
    render(<WelcomeSection />);
    expect(screen.queryByText('Verified Score')).not.toBeInTheDocument();
  });

  describe('with metrics', () => {
    it('shows competitor score metrics', () => {
      render(<WelcomeSection showMetrics verifiedScore={450} totalScore={520} />);
      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('520')).toBeInTheDocument();
    });

    it('shows admin event metrics', () => {
      mockAuth.user = { name: 'Admin', role: 'ADMIN' };
      render(<WelcomeSection showMetrics totalEvents={12} activeEvents={5} />);
      expect(screen.getByText('Total Events')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Active Events')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows admin user metrics when available', () => {
      mockAuth.user = { name: 'Admin', role: 'ADMIN' };
      render(<WelcomeSection showMetrics totalUsers={100} activeUsers={42} />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('shows loading skeleton when isLoading', () => {
      const { container } = render(<WelcomeSection showMetrics isLoading />);
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });
  });
});
