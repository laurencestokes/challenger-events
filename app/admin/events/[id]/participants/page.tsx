'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import ScoreSubmissionModal from '@/components/ScoreSubmissionModal';
import Link from 'next/link';

interface Participant {
  id: string;
  name: string;
  email?: string;
  age?: number;
  sex?: 'M' | 'F';
  bodyweight?: number;
  isGuest?: boolean;
  joinedAt?: unknown;
}

export default function EventParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<{ name: string; code: string } | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Form state for adding/editing guest
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [bodyweight, setBodyweight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [eventData, participantsData] = await Promise.all([
        api.get(`/api/events/${eventId}`),
        api.get(`/api/events/${eventId}/participants`),
      ]);

      setEvent(eventData);
      setParticipants(participantsData.participants || []);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!name || !age || !sex || !bodyweight) {
      setError('All fields are required');
      setIsSubmitting(false);
      return;
    }

    const ageNum = Number(age);
    const bodyweightNum = Number(bodyweight);

    if (isNaN(ageNum) || ageNum < 1 || ageNum > 100) {
      setError('Age must be between 1 and 100');
      setIsSubmitting(false);
      return;
    }

    if (isNaN(bodyweightNum) || bodyweightNum <= 40 || bodyweightNum > 250) {
      setError('Bodyweight must be between 40 and 500 kg');
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingParticipant) {
        // Calculate new dateOfBirth from age
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - ageNum;
        const dateOfBirth = new Date(birthYear, 0, 1);

        // Use API to update via user update endpoint
        await api.put(`/api/admin/users/${editingParticipant.id}`, {
          name,
          bodyweight: bodyweightNum,
          dateOfBirth: dateOfBirth.toISOString(),
          sex,
        });
      } else {
        // Create new guest participant
        await api.post(`/api/admin/events/${eventId}/guest-participants`, {
          name,
          age: ageNum,
          sex,
          bodyweight: bodyweightNum,
        });
      }

      // Reset form and refresh
      setName('');
      setAge('');
      setSex('M');
      setBodyweight('');
      setEditingParticipant(null);
      setShowAddModal(false);
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add participant';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGuest = (participant: Participant) => {
    if (!participant.isGuest) return;

    setEditingParticipant(participant);
    setName(participant.name);
    setAge(participant.age?.toString() || '');
    setSex(participant.sex || 'M');
    setBodyweight(participant.bodyweight?.toString() || '');
    setShowAddModal(true);
  };

  const handleDeleteGuest = async (participantId: string) => {
    if (!confirm('Are you sure you want to delete this guest participant?')) {
      return;
    }

    try {
      // Use apiRequest directly for DELETE with body
      const { apiRequest } = await import('@/lib/api-client');
      await apiRequest(`/api/admin/events/${eventId}/guest-participants`, {
        method: 'DELETE',
        body: JSON.stringify({ participantId }),
      });
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete participant';
      setError(errorMessage);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingParticipant(null);
    setName('');
    setAge('');
    setSex('M');
    setBodyweight('');
  };

  const regularParticipants = participants.filter((p) => !p.isGuest);
  const guestParticipants = participants.filter((p) => p.isGuest);

  return (
    <ProtectedRoute requireAdmin>
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <WelcomeSection showMetrics={true} isLoading={isLoading} />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => router.push('/admin/events')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
              >
                Manage Events
              </button>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <Link
                href={`/admin/events/${eventId}`}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
              >
                Event Details
              </Link>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <span className="text-gray-900 dark:text-white text-sm font-medium">
                Participants
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {event?.name ? `Participants - ${event.name}` : 'Participants'}
                </h1>
                <p className="mt-2 text-gray-400">Manage participants for this event</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/public/leaderboard/${eventId}`}
                  target="_blank"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  View Leaderboard
                </Link>
                <button
                  onClick={() => setShowScoreModal(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Add Score
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Add Guest Participant
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Participants List */}
          <div className="space-y-6">
            {/* Regular Participants */}
            {regularParticipants.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Registered Participants ({regularParticipants.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Age
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Sex
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Bodyweight
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {regularParticipants.map((participant) => (
                        <tr
                          key={participant.id}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <td className="py-3 px-4 text-white">{participant.name}</td>
                          <td className="py-3 px-4 text-gray-400">{participant.email || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-400">{participant.age || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-400">{participant.sex || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-400">
                            {participant.bodyweight ? `${participant.bodyweight} kg` : 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setShowScoreModal(true)}
                              className="text-orange-400 hover:text-orange-300 text-sm"
                            >
                              Add Score
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Guest Participants */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Guest Participants ({guestParticipants.length})
                </h2>
              </div>
              {guestParticipants.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No guest participants yet. Click "Add Guest Participant" to add one.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Age
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Sex
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Bodyweight
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {guestParticipants.map((participant) => (
                        <tr
                          key={participant.id}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <td className="py-3 px-4 text-white">{participant.name}</td>
                          <td className="py-3 px-4 text-gray-400">{participant.age || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-400">{participant.sex || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-400">
                            {participant.bodyweight ? `${participant.bodyweight} kg` : 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowScoreModal(true)}
                                className="text-orange-400 hover:text-orange-300 text-sm"
                              >
                                Score
                              </button>
                              <button
                                onClick={() => handleEditGuest(participant)}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteGuest(participant.id)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Add/Edit Guest Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {editingParticipant ? 'Edit Guest Participant' : 'Add Guest Participant'}
                </h2>
                <form onSubmit={handleAddGuest} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-1">
                      Age *
                    </label>
                    <input
                      type="number"
                      id="age"
                      required
                      min="1"
                      max="120"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="sex" className="block text-sm font-medium text-gray-300 mb-1">
                      Sex *
                    </label>
                    <select
                      id="sex"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={sex}
                      onChange={(e) => setSex(e.target.value as 'M' | 'F')}
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="bodyweight"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Bodyweight (kg) *
                    </label>
                    <input
                      type="number"
                      id="bodyweight"
                      required
                      min="0"
                      max="500"
                      step="0.1"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={bodyweight}
                      onChange={(e) => setBodyweight(e.target.value)}
                    />
                  </div>
                  {error && (
                    <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : editingParticipant ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Score Submission Modal */}
          <ScoreSubmissionModal
            eventId={eventId}
            isOpen={showScoreModal}
            onClose={() => setShowScoreModal(false)}
            onScoreSubmitted={() => {
              fetchData();
            }}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
