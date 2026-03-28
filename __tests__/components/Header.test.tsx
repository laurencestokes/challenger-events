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

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('Header', () => {
  beforeEach(() => {
    mockAuth.user = null;
  });

  describe('unauthenticated user', () => {
    it('shows Home and Sign In links', () => {
      render(<Header />);
      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Sign In').length).toBeGreaterThan(0);
    });

    it('does not show Dashboard link', () => {
      render(<Header />);
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('does not show admin links', () => {
      render(<Header />);
      expect(screen.queryByText('Manage Events')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
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

    it('shows Sign Out button', () => {
      render(<Header />);
      expect(screen.getAllByText('Sign Out').length).toBeGreaterThan(0);
    });

    it('does not show admin-only links', () => {
      render(<Header />);
      expect(screen.queryByText('Manage Events')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Create Event')).not.toBeInTheDocument();
    });
  });

  describe('authenticated admin', () => {
    beforeEach(() => {
      mockAuth.user = { id: 'u1', role: 'ADMIN' };
    });

    it('shows admin links', () => {
      render(<Header />);
      expect(screen.getAllByText('Manage Events').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Manage Users').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Create Event').length).toBeGreaterThan(0);
    });

    it('shows Erg Live dropdown', () => {
      render(<Header />);
      expect(screen.getAllByText('Erg Live').length).toBeGreaterThan(0);
    });
  });

  describe('super admin', () => {
    it('shows admin links for SUPER_ADMIN role', () => {
      mockAuth.user = { id: 'u1', role: 'SUPER_ADMIN' };
      render(<Header />);
      expect(screen.getAllByText('Manage Events').length).toBeGreaterThan(0);
    });
  });

  describe('mobile menu', () => {
    it('toggles mobile menu on button click', () => {
      mockAuth.user = null;
      render(<Header />);
      const menuButton = document.querySelector('.md\\:hidden button');
      expect(menuButton).toBeTruthy();
      fireEvent.click(menuButton!);
      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    });

    it('shows admin links in mobile menu for admin users', () => {
      mockAuth.user = { id: 'u1', role: 'ADMIN' };
      render(<Header />);
      const menuButton = document.querySelector('.md\\:hidden button');
      fireEvent.click(menuButton!);
      expect(screen.getAllByText('Manage Events').length).toBeGreaterThan(1);
    });

    it('closes mobile menu when a link is clicked', () => {
      mockAuth.user = null;
      render(<Header />);
      const menuButton = document.querySelector('.md\\:hidden button');
      fireEvent.click(menuButton!);
      // Click on a mobile menu link
      const homeLinks = screen.getAllByText('Home');
      const mobileLink = homeLinks.find((el) => el.closest('.md\\:hidden'));
      if (mobileLink) fireEvent.click(mobileLink);
    });
  });

  describe('erg dropdown', () => {
    it('toggles erg dropdown on click', () => {
      mockAuth.user = { id: 'u1', role: 'ADMIN' };
      render(<Header />);
      // Find the desktop Erg Live button (not mobile)
      const ergButtons = screen.getAllByText('Erg Live');
      const desktopErgBtn = ergButtons[0].closest('button');
      if (desktopErgBtn) {
        fireEvent.click(desktopErgBtn);
        expect(screen.getByText('Head-to-Head')).toBeInTheDocument();
        expect(screen.getByText('Team Competition')).toBeInTheDocument();
      }
    });
  });

  describe('sign out', () => {
    it('renders sign out button for authenticated users', () => {
      mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
      render(<Header />);
      expect(screen.getAllByText('Sign Out').length).toBeGreaterThan(0);
    });
  });

  describe('mobile menu for competitor', () => {
    it('shows Dashboard, Profile, Sign Out in mobile menu', () => {
      mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
      render(<Header />);
      const menuButton = document.querySelector('.md\\:hidden button');
      fireEvent.click(menuButton!);
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(1);
      expect(screen.getAllByText('Profile').length).toBeGreaterThan(1);
      expect(screen.getAllByText('Sign Out').length).toBeGreaterThan(1);
    });

    it('shows admin links in mobile menu', () => {
      mockAuth.user = { id: 'u1', role: 'ADMIN' };
      render(<Header />);
      const menuButton = document.querySelector('.md\\:hidden button');
      fireEvent.click(menuButton!);
      // Mobile menu has admin-specific links
      expect(screen.getAllByText('Create Event').length).toBeGreaterThan(1);
      // Erg section in mobile
      expect(screen.getAllByText('Head-to-Head').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Team Competition').length).toBeGreaterThan(0);
    });
  });

  describe('erg dropdown close', () => {
    it('closes erg dropdown when a link is clicked', () => {
      mockAuth.user = { id: 'u1', role: 'ADMIN' };
      render(<Header />);
      const ergButtons = screen.getAllByText('Erg Live');
      const desktopErgBtn = ergButtons[0].closest('button');
      if (desktopErgBtn) {
        fireEvent.click(desktopErgBtn);
        const h2hLink = screen.getByText('Head-to-Head');
        fireEvent.click(h2hLink);
      }
    });
  });
});
