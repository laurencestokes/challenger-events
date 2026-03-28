import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminDashboard from '../../components/AdminDashboard';

const mockGet = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
}));

const mockAuth = { user: null as any };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = { id: 'admin1', name: 'Admin', role: 'ADMIN' };
  });

  it('shows loading skeleton initially', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<AdminDashboard />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders events after loading', async () => {
    mockGet.mockResolvedValue([
      {
        id: 'e1',
        name: 'Spring Challenge',
        code: 'SPR001',
        status: 'ACTIVE',
        startDate: null,
        endDate: null,
        createdAt: '2026-01-01',
      },
      {
        id: 'e2',
        name: 'Summer Comp',
        code: 'SUM002',
        status: 'DRAFT',
        startDate: null,
        endDate: null,
        createdAt: '2026-02-01',
      },
    ]);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Spring Challenge')).toBeInTheDocument();
      expect(screen.getByText('Summer Comp')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument();
    });
  });

  it('does not fetch when user is null', () => {
    mockAuth.user = null;
    render(<AdminDashboard />);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('renders event status badges', async () => {
    mockGet.mockResolvedValue([
      {
        id: 'e1',
        name: 'Active Event',
        code: 'ACT',
        status: 'ACTIVE',
        startDate: null,
        endDate: null,
        createdAt: '2026-01-01',
      },
    ]);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });
  });
});
