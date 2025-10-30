'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../contexts/AuthContext';
import { api } from '../../../../../lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Event {
  id: string;
  name: string;
  description?: string;
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: unknown;
  isTeamEvent?: boolean;
  teamScoringMethod?: 'SUM' | 'AVERAGE' | 'BEST';
  maxTeamSize?: number;
  country?: string;
  postcode?: string;
}

export default function EditEvent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('DRAFT');
  const [isTeamEvent, setIsTeamEvent] = useState(true);
  const [teamScoringMethod, setTeamScoringMethod] = useState<'SUM' | 'AVERAGE' | 'BEST'>('SUM');
  const [maxTeamSize, setMaxTeamSize] = useState<number>(4);
  const [country, setCountry] = useState('GB');
  const [postcode, setPostcode] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventData = await api.get(`/api/events/${params.id}`);
        setEvent(eventData);

        // Populate form fields
        setName(eventData.name);
        setDescription(eventData.description || '');
        setStatus(eventData.status);
        setIsTeamEvent(eventData.isTeamEvent ?? true);
        setTeamScoringMethod(eventData.teamScoringMethod || 'SUM');
        setMaxTeamSize(eventData.maxTeamSize || 4);
        setCountry(eventData.country || 'GB');
        setPostcode(eventData.postcode || '');

        // Format dates for input fields
        if (eventData.startDate) {
          const startDate =
            'seconds' in eventData.startDate
              ? new Date((eventData.startDate as { seconds: number }).seconds * 1000)
              : new Date(eventData.startDate as string);
          setStartDate(startDate.toISOString().slice(0, 16));
        }

        if (eventData.endDate) {
          const endDate =
            'seconds' in eventData.endDate
              ? new Date((eventData.endDate as { seconds: number }).seconds * 1000)
              : new Date(eventData.endDate as string);
          setEndDate(endDate.toISOString().slice(0, 16));
        }
      } catch (error: unknown) {
        console.error('Error fetching event:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch event';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchEvent();
    }
  }, [user, params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updates = {
        name,
        description: description || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        status,
        isTeamEvent,
        teamScoringMethod: isTeamEvent ? teamScoringMethod : undefined,
        maxTeamSize: isTeamEvent ? maxTeamSize : undefined,
        country,
        postcode: postcode || undefined,
      };

      await api.put(`/api/events/${params.id}`, updates);
      setSuccess('Event updated successfully!');

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin/events');
      }, 1500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await api.delete(`/api/events/${params.id}`);
      setSuccess('Event deleted successfully!');

      setTimeout(() => {
        router.push('/admin/events');
      }, 1500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsSaving(true);
    setError('');

    try {
      await api.put(`/api/events/${params.id}`, { status: 'ACTIVE' });
      setStatus('ACTIVE');
      setSuccess('Event published successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish event';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !event) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => router.push('/admin/events')}
              className="mt-4 text-indigo-600 hover:text-indigo-500"
            >
              Back to Events
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Update event details and publish when ready
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {event?.status === 'DRAFT' && (
                  <button
                    onClick={handlePublish}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Publishing...' : 'Publish Event'}
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {isSaving ? 'Deleting...' : 'Delete Event'}
                </button>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-4">
              <p className="text-green-800 dark:text-green-200">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Event Code Display */}
          {event && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md p-4">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Event Code:</strong> <span className="font-mono">{event.code}</span>
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                Share this code with competitors to let them join the event.
              </p>
            </div>
          )}

          {/* Edit Form */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Event Details</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Event Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Location Settings */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="country"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Country
                    </label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="GB">United Kingdom</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="postcode"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Postcode (Optional)
                    </label>
                    <input
                      type="text"
                      id="postcode"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="e.g., SW1A 1AA"
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED')
                  }
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Team Event Settings */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Team Competition Settings
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isTeamEvent"
                      checked={isTeamEvent}
                      onChange={(e) => setIsTeamEvent(e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isTeamEvent"
                      className="ml-2 block text-sm text-gray-900 dark:text-white"
                    >
                      Enable team competition
                    </label>
                  </div>

                  {isTeamEvent && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                      <div>
                        <label
                          htmlFor="teamScoringMethod"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Team Scoring Method
                        </label>
                        <select
                          id="teamScoringMethod"
                          value={teamScoringMethod}
                          onChange={(e) =>
                            setTeamScoringMethod(e.target.value as 'SUM' | 'AVERAGE' | 'BEST')
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                        >
                          <option value="SUM">Sum of all member scores</option>
                          <option value="AVERAGE">Average of member scores</option>
                          <option value="BEST">Best individual score</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="maxTeamSize"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Maximum Team Size
                        </label>
                        <input
                          type="number"
                          id="maxTeamSize"
                          min="2"
                          max="10"
                          value={maxTeamSize}
                          onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6">
                <button
                  type="button"
                  onClick={() => router.push('/admin/events')}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
