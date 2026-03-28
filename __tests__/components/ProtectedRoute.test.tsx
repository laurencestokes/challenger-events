import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../../components/ProtectedRoute';

// Mock dependencies
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockAuth = {
  user: null as any,
  firebaseUser: null as any,
  loading: false,
};
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const mockIsEmailVerified = jest.fn();
jest.mock('../../lib/firebase-auth', () => ({
  isEmailVerified: (...args: any[]) => mockIsEmailVerified(...args),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = null;
    mockAuth.firebaseUser = null;
    mockAuth.loading = false;
    mockIsEmailVerified.mockReturnValue(true);
  });

  it('shows loading spinner when auth is loading', () => {
    mockAuth.loading = true;
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    // LoadingSpinner renders the spinner
    expect(document.querySelector('[data-testid="loading-spinner"]')).toBeInTheDocument();
  });

  it('redirects to signin when requireAuth and no user', () => {
    mockAuth.user = null;
    render(
      <ProtectedRoute requireAuth={true}>
        <div>Protected content</div>
      </ProtectedRoute>,
    );
    expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to verify-email when email is not verified', () => {
    mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
    mockAuth.firebaseUser = { uid: 'u1' };
    mockIsEmailVerified.mockReturnValue(false);

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );
    expect(mockPush).toHaveBeenCalledWith('/auth/verify-email');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to dashboard when requireAdmin and user is not admin', () => {
    mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
    mockAuth.firebaseUser = { uid: 'u1' };
    mockIsEmailVerified.mockReturnValue(true);

    render(
      <ProtectedRoute requireAdmin={true}>
        <div>Admin content</div>
      </ProtectedRoute>,
    );
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated with verified email', () => {
    mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
    mockAuth.firebaseUser = { uid: 'u1' };
    mockIsEmailVerified.mockReturnValue(true);

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders children for admin when requireAdmin is true', () => {
    mockAuth.user = { id: 'u1', role: 'ADMIN' };
    mockAuth.firebaseUser = { uid: 'u1' };
    mockIsEmailVerified.mockReturnValue(true);

    render(
      <ProtectedRoute requireAdmin={true}>
        <div>Admin content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Admin content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders children when requireAuth is false (public route)', () => {
    mockAuth.user = null;
    render(
      <ProtectedRoute requireAuth={false}>
        <div>Public content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Public content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('defaults requireAuth to true', () => {
    mockAuth.user = null;
    render(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>,
    );
    expect(mockPush).toHaveBeenCalledWith('/auth/signin');
  });
});
