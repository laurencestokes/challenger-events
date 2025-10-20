'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { api } from '../../../../../lib/api-client';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import { EventListSkeleton } from '@/components/SkeletonLoaders';

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
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<CompetitionVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [selectedCompetitor, setSelectedCompetitor] = useState<User | null>(null);
  const [showWeighInModal, setShowWeighInModal] = useState(false);
  const [bodyweight, setBodyweight] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventData, participantsData, verificationsData] = await Promise.all([
          api.get(`/api/events/${params.id}`),
          api.get(`/api/events/${params.id}`),
          api.get(`/api/events/${params.id}/competition-verification`),
        ]);

        setEvent(eventData);
        setParticipants(participantsData.participants || []);
        setVerifications(verificationsData.verifications || []);
      } catch (error: unknown) {
        console.error('Error fetching data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, params.id]);

  const handleWeighIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetitor || !bodyweight) return;

    try {
      await api.post(`/api/events/${params.id}/competition-verification`, {
        competitorId: selectedCompetitor.id,
        bodyweight: Number(bodyweight),
        verificationNotes,
      });

      // Refresh verifications
      const verificationsData = await api.get(`/api/events/${params.id}/competition-verification`);
      setVerifications(verificationsData.verifications || []);

      setShowWeighInModal(false);
      setSelectedCompetitor(null);
      setBodyweight('');
      setVerificationNotes('');
    } catch (error: unknown) {
      console.error('Error weighing in competitor:', error);
      setError('Failed to weigh in competitor');
    }
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
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'PENDING':
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 border-primary-500"></div>
              <p className="text-white text-lg">Loading competition verification...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Link
                    href="/dashboard"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Dashboard
                  </Link>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <Link
                    href="/admin"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Admin
                  </Link>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <Link
                    href="/admin/events"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Events
                  </Link>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <span className="text-gray-900 dark:text-white text-sm font-medium">
                    Competition Verification
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Competition Verification: {event?.name}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Weigh and verify competitors for this competition
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
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
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Competitors Table */}
          <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Competitors</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <EventListSkeleton />
              ) : participants.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No competitors found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Competitor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Profile Weight
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Competition Weight
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {participants.map((competitor) => {
                        const status = getVerificationStatus(competitor.id);
                        const competitionWeight = getVerificationBodyweight(competitor.id);

                        return (
                          <tr
                            key={competitor.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {competitor.name || 'No name'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {competitor.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {competitor.bodyweight ? `${competitor.bodyweight}kg` : 'Not set'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
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
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
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
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Weigh In: {selectedCompetitor.name || selectedCompetitor.email}
                </h3>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Competitor Details
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                      placeholder="Enter weight in kg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                      placeholder="Add any notes about this weigh-in..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowWeighInModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
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
