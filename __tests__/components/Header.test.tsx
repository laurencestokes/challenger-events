import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../../components/Header';

// Mock dependencies
const mockAuth = {
  user: null as any,
};
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../lib/firebase-auth', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

describe('Header', () => {
  beforeEach(() => {
    mockAuth.user = null;
  });

  describe('branding', () => {
    it('renders the Wordmark SVG linking to home', () => {
      render(<Header />);
      const wordmarkLinks = document.querySelectorAll('a[href="/"]');
      expect(wordmarkLinks.length).toBeGreaterThan(0);
      // Wordmark is an SVG inside a link
      const svgs = wordmarkLinks[0].querySelectorAll('svg');
      expect(svgs.length).toBe(1);
    });

    it('renders the Logo icon linking to home', () => {
      render(<Header />);
      // Logo is the second link to "/" (after wordmark), hidden on mobile via sm:block
      const homeLinks = document.querySelectorAll('a[href="/"]');
      // At least wordmark + logo (when not counting nav Home link)
      expect(homeLinks.length).toBeGreaterThanOrEqual(2);
    });

    it('renders Beta badge', () => {
      render(<Header />);
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });
  });

  describe('unauthenticated user', () => {
    it('shows Home link and Login button', () => {
      render(<Header />);
      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Login_').length).toBeGreaterThan(0);
    });

    it('does not show Dashboard link', () => {
      render(<Header />);
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('renders Login as a styled button, not a plain link', () => {
      render(<Header />);
      const loginEl = screen.getAllByText('Login_')[0];
      // DS Button renders as an <a> with button-like styling
      expect(loginEl.closest('a')).toBeTruthy();
      expect(loginEl.closest('a')?.getAttribute('href')).toBe('/auth/signin');
    });
  });

  describe('authenticated competitor', () => {
    beforeEach(() => {
      mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
    });

    it('shows Dashboard and Profile links', () => {
      render(<Header />);
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
    });

    it('shows Logout button', () => {
      render(<Header />);
      expect(screen.getAllByText('Logout_').length).toBeGreaterThan(0);
    });

    it('renders Logout as a styled button', () => {
      render(<Header />);
      const logoutEl = screen.getAllByText('Logout_')[0];
      expect(logoutEl.closest('button')).toBeTruthy();
    });

    it('does not show admin-only links', () => {
      render(<Header />);
      expect(screen.queryByText('Events')).not.toBeInTheDocument();
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Create')).not.toBeInTheDocument();
    });
  });

  describe('authenticated admin', () => {
    beforeEach(() => {
      mockAuth.user = { id: 'u1', role: 'ADMIN' };
    });

    it('shows admin links', () => {
      render(<Header />);
      expect(screen.getAllByText('Events').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Users').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Create').length).toBeGreaterThan(0);
    });

    it('shows Erg links', () => {
      render(<Header />);
      expect(screen.getAllByText('Erg H2H').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Erg Team').length).toBeGreaterThan(0);
    });
  });

  describe('super admin', () => {
    it('shows admin links for SUPER_ADMIN role', () => {
      mockAuth.user = { id: 'u1', role: 'SUPER_ADMIN' };
      render(<Header />);
      expect(screen.getAllByText('Events').length).toBeGreaterThan(0);
    });
  });

  describe('mobile menu', () => {
    it('renders the hamburger menu button', () => {
      render(<Header />);
      // The hamburger button contains "=" text
      expect(screen.getAllByText('=').length).toBeGreaterThan(0);
    });

    it('opens mobile menu when hamburger is clicked', () => {
      mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
      render(<Header />);
      const hamburger = screen.getAllByText('=')[0].closest('button');
      expect(hamburger).toBeTruthy();
      fireEvent.click(hamburger!);
      // The close button (✕) should appear
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('closes mobile menu when close button is clicked', () => {
      mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
      render(<Header />);
      const hamburger = screen.getAllByText('=')[0].closest('button');
      fireEvent.click(hamburger!);
      const closeBtn = screen.getByText('✕').closest('button');
      expect(closeBtn).toBeTruthy();
      fireEvent.click(closeBtn!);
    });
  });

  describe('sign out', () => {
    it('calls signOut when Logout is clicked', async () => {
      const { signOut: mockSignOut } = require('../../lib/firebase-auth');
      mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
      render(<Header />);
      const logoutBtn = screen.getAllByText('Logout_')[0].closest('button');
      fireEvent.click(logoutBtn!);
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
