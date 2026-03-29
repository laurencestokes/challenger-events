'use client';

import { useState } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { api } from '../../../../../lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@lib/queryKeys';
import Link from 'next/link';
import ProtectedRoute from '@components/ProtectedRoute';
import WelcomeSection from '@components/WelcomeSection';
import { EventListSkeleton } from '@components/SkeletonLoaders';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: 'M' | 'F';
}

interface CompetitionVerification {
  id: string;
  userId: string;
  eventId: string;
  bodyweight: number;
  verifiedBy: string;
  verifiedAt: unknown;
  verificationNotes?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
}

export default function CompetitionVerificationPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const eventId = params.id;

  // Modal state
  const [selectedCompetitor, setSelectedCompetitor] = useState<User | null>(null);
  const [showWeighInModal, setShowWeighInModal] = useState(false);
  const [bodyweight, setBodyweight] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  const {
    data: eventData,
    isLoading: isLoadingEvent,
    error: eventError,
  } = useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => api.get(`/api/events/${eventId}`),
    enabled: !!user && !!eventId,
  });

  const { data: verificationData, isLoading: isLoadingVerification } = useQuery({
    queryKey: queryKeys.events.competitionVerification(eventId),
    queryFn: () => api.get(`/api/events/${eventId}/competition-verification`),
    enabled: !!user && !!eventId,
  });

  const isLoading = isLoadingEvent || isLoadingVerification;
  const error =
    eventError instanceof Error ? eventError.message : eventError ? 'Failed to fetch data' : '';

  const event: Event | null = eventData || null;
  const participants: User[] = eventData?.participants || [];
  const verifications: CompetitionVerification[] = verificationData?.verifications || [];

  const weighInMutation = useMutation({
    mutationFn: (data: { competitorId: string; bodyweight: number; verificationNotes: string }) =>
      api.post(`/api/events/${eventId}/competition-verification`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.competitionVerification(eventId),
      });
      setShowWeighInModal(false);
      setSelectedCompetitor(null);
      setBodyweight('');
      setVerificationNotes('');
    },
    onError: (err: unknown) => {
      console.error('Error weighing in competitor:', err);
    },
  });

  const handleWeighIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetitor || !bodyweight) return;

    weighInMutation.mutate({
      competitorId: selectedCompetitor.id,
      bodyweight: Number(bodyweight),
      verificationNotes,
    });
  };

  const openWeighInModal = (competitor: User) => {
    setSelectedCompetitor(competitor);
    setBodyweight(competitor.bodyweight?.toString() || '');
    setVerificationNotes('');
    setShowWeighInModal(true);
  };

  const getVerificationStatus = (competitorId: string) => {
    const verification = verifications.find((v) => v.userId === competitorId);
    return verification?.status || 'PENDING';
  };

  const getVerificationBodyweight = (competitorId: string) => {
    const verification = verifications.find((v) => v.userId === competitorId);
    return verification?.bodyweight;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-900 text-green-200';
      case 'REJECTED':
        return 'bg-red-900 text-red-200';
      case 'PENDING':
      default:
        return 'bg-yellow-900 text-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 border-primary"></div>
              <p className="text-white text-lg">Loading competition verification...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
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
                  <Link
                    href="/admin/events"
                    className="text-muted hover:text-text-secondary text-sm"
                  >
                    Events
                  </Link>
                  <span className="text-muted">/</span>
                  <span className="text-text-primary text-sm font-medium">
                    Competition Verification
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-text-primary">
                  Competition Verification: {event?.name}
                </h1>
                <p className="mt-2 text-text-secondary">
                  Weigh and verify competitors for this competition
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">Error</h3>
                  <div className="mt-2 text-sm text-red-300">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Competitors Table */}
          <div className="bg-surface-low rounded-lg">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-medium text-text-primary">Competitors</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <EventListSkeleton />
              ) : participants.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary">No competitors found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-surface-high">
                    <thead className="bg-surface-high">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Competitor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Profile Weight
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Competition Weight
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface-low divide-y divide-surface-high">
                      {participants.map((competitor) => {
                        const status = getVerificationStatus(competitor.id);
                        const competitionWeight = getVerificationBodyweight(competitor.id);

                        return (
                          <tr key={competitor.id} className="hover:bg-surface-high">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-text-primary">
                                  {competitor.name || 'No name'}
                                </div>
                                <div className="text-sm text-text-secondary">
                                  {competitor.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                              {competitor.bodyweight ? `${competitor.bodyweight}kg` : 'Not set'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                              {competitionWeight ? `${competitionWeight}kg` : 'Not weighed'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => openWeighInModal(competitor)}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                {status === 'VERIFIED' ? 'Re-weigh' : 'Weigh In'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weigh In Modal */}
        {showWeighInModal && selectedCompetitor && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-surface-low">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-text-primary mb-4">
                  Weigh In: {selectedCompetitor.name || selectedCompetitor.email}
                </h3>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-text-secondary mb-2">
                    Competitor Details
                  </h4>
                  <div className="text-sm text-text-secondary space-y-1">
                    <div>Email: {selectedCompetitor.email}</div>
                    <div>
                      Profile Weight:{' '}
                      {selectedCompetitor.bodyweight
                        ? `${selectedCompetitor.bodyweight}kg`
                        : 'Not set'}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleWeighIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="bodyweight"
                      className="block text-sm font-medium text-text-secondary"
                    >
                      Competition Weight (kg) *
                    </label>
                    <input
                      type="number"
                      id="bodyweight"
                      value={bodyweight}
                      onChange={(e) => setBodyweight(e.target.value)}
                      required
                      step="0.1"
                      className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
                      placeholder="Enter weight in kg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-text-secondary"
                    >
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
                      placeholder="Add any notes about this weigh-in..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowWeighInModal(false)}
                      className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-high border border-border rounded-md hover:bg-surface-high"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                    >
                      Weigh In
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
