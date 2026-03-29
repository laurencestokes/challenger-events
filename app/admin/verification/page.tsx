'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api-client';
import { queryKeys } from '../../../lib/queryKeys';
import Link from 'next/link';
import ProtectedRoute from '@components/ProtectedRoute';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: unknown;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEEDS_REVERIFICATION';
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: unknown;
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: 'M' | 'F';
}

interface VerificationStats {
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
}

export default function VerificationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<
    'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEEDS_REVERIFICATION' | 'ALL'
  >('PENDING');

  // Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: () => api.get('/api/admin/users'),
    enabled: !!user,
  });

  const users: User[] = useMemo(() => data?.users || [], [data?.users]);
  const error =
    queryError instanceof Error ? queryError.message : queryError ? 'Failed to fetch users' : '';

  const stats: VerificationStats | null = useMemo(() => {
    if (!users.length) return null;
    return {
      totalPending: users.filter((u) => u.verificationStatus === 'PENDING').length,
      totalVerified: users.filter((u) => u.verificationStatus === 'VERIFIED').length,
      totalRejected: users.filter((u) => u.verificationStatus === 'REJECTED').length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (statusFilter === 'ALL') return users;
    return users.filter((user) => user.verificationStatus === statusFilter);
  }, [users, statusFilter]);

  const verifyMutation = useMutation({
    mutationFn: ({
      userId,
      verificationStatus,
      verificationNotes,
    }: {
      userId: string;
      verificationStatus: 'VERIFIED' | 'REJECTED' | 'NEEDS_REVERIFICATION';
      verificationNotes: string;
    }) =>
      api.put(`/api/admin/users/${userId}/verify`, {
        verificationStatus,
        verificationNotes,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all() }),
  });

  const handleVerification = (
    verificationStatus: 'VERIFIED' | 'REJECTED' | 'NEEDS_REVERIFICATION',
  ) => {
    if (!selectedUser) return;

    verifyMutation.mutate(
      { userId: selectedUser.id, verificationStatus, verificationNotes },
      {
        onSuccess: () => {
          setShowVerificationModal(false);
          setSelectedUser(null);
          setVerificationNotes('');
        },
      },
    );
  };

  const openVerificationModal = (user: User) => {
    setSelectedUser(user);
    setVerificationNotes(user.verificationNotes || '');
    setShowVerificationModal(true);
  };

  const formatDate = (dateString: unknown): string => {
    if (!dateString) return 'Never';

    let date: Date;

    if (typeof dateString === 'object' && dateString !== null) {
      if (
        'seconds' in dateString &&
        typeof (dateString as { seconds: number }).seconds === 'number'
      ) {
        date = new Date((dateString as { seconds: number }).seconds * 1000);
      } else if (
        'toDate' in dateString &&
        typeof (dateString as { toDate: () => Date }).toDate === 'function'
      ) {
        date = (dateString as { toDate: () => Date }).toDate();
      } else {
        return 'Invalid date';
      }
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'number') {
      date = new Date(dateString);
    } else {
      return 'Invalid date';
    }

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString();
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-900 text-green-200';
      case 'REJECTED':
        return 'bg-red-900 text-red-200';
      case 'NEEDS_REVERIFICATION':
        return 'bg-orange-900 text-orange-200';
      case 'PENDING':
      default:
        return 'bg-yellow-900 text-yellow-200';
    }
  };

  return (
    <ProtectedRoute>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Link href="/dashboard" className="text-muted hover:text-text-secondary text-sm">
                    Dashboard
                  </Link>
                  <span className="text-muted">/</span>
                  <Link href="/admin" className="text-muted hover:text-text-secondary text-sm">
                    Admin
                  </Link>
                  <span className="text-muted">/</span>
                  <span className="text-text-primary text-sm font-medium">Verification</span>
                </div>
                <h1 className="text-3xl font-bold text-text-primary">User Verification</h1>
                <p className="mt-2 text-text-secondary">Review and verify user accounts</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-surface-low rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-text-secondary">Pending</p>
                    <p className="text-2xl font-semibold text-text-primary">{stats.totalPending}</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-low rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-text-secondary">Verified</p>
                    <p className="text-2xl font-semibold text-text-primary">
                      {stats.totalVerified}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-low rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-text-secondary">Rejected</p>
                    <p className="text-2xl font-semibold text-text-primary">
                      {stats.totalRejected}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="bg-surface-low rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-text-primary">Verification Requests</h2>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL')
                }
                className="px-3 py-2 border border-border rounded-md shadow-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
              >
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
                <option value="NEEDS_REVERIFICATION">Needs Re-verification</option>
                <option value="ALL">All</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-surface-low rounded-lg">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-medium text-text-primary">Users</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-text-secondary">Loading users...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-error-600">{error}</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary">No users found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-surface-high">
                    <thead className="bg-surface-high">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Verification Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface-low divide-y divide-surface-high">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-surface-high">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-text-primary">
                                {user.name || 'No name'}
                              </div>
                              <div className="text-sm text-text-secondary">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-text-primary">{user.role}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getVerificationColor(user.verificationStatus || 'PENDING')}`}
                            >
                              {user.verificationStatus || 'PENDING'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                            <div>
                              <div>
                                Bodyweight: {user.bodyweight ? `${user.bodyweight}kg` : 'Not set'}
                              </div>
                              <div>
                                Age: {user.dateOfBirth ? formatDate(user.dateOfBirth) : 'Not set'}
                              </div>
                              <div>Sex: {user.sex || 'Not set'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {(user.verificationStatus || 'PENDING') === 'PENDING' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => openVerificationModal(user)}
                                  className="text-blue-400 hover:text-blue-300 text-sm"
                                >
                                  Review
                                </button>
                              </div>
                            )}
                            {(user.verificationStatus || 'PENDING') !== 'PENDING' && (
                              <div className="text-sm text-text-secondary">
                                {user.verificationNotes && (
                                  <div className="text-xs">Notes: {user.verificationNotes}</div>
                                )}
                                {user.verifiedAt !== null && user.verifiedAt !== undefined && (
                                  <div className="text-xs">
                                    Verified: {formatDate(user.verifiedAt)}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification Modal */}
        {showVerificationModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-surface-low">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-text-primary mb-4">
                  Verify User: {selectedUser.name || selectedUser.email}
                </h3>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-text-secondary mb-2">User Details</h4>
                  <div className="text-sm text-text-secondary space-y-1">
                    <div>Email: {selectedUser.email}</div>
                    <div>Role: {selectedUser.role}</div>
                    <div>
                      Bodyweight:{' '}
                      {selectedUser.bodyweight ? `${selectedUser.bodyweight}kg` : 'Not set'}
                    </div>
                    <div>
                      Age:{' '}
                      {selectedUser.dateOfBirth ? formatDate(selectedUser.dateOfBirth) : 'Not set'}
                    </div>
                    <div>Sex: {selectedUser.sex || 'Not set'}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="notes" className="block text-sm font-medium text-text-secondary">
                    Verification Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
                    placeholder="Add any notes about this verification..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowVerificationModal(false)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-high border border-border rounded-md hover:bg-surface-high"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleVerification('REJECTED')}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerification('VERIFIED')}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
