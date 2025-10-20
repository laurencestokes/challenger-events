'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';

export default function CreateEvent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isTeamEvent, setIsTeamEvent] = useState(true);
  const [teamScoringMethod, setTeamScoringMethod] = useState<'SUM' | 'AVERAGE' | 'BEST'>('SUM');
  const [maxTeamSize, setMaxTeamSize] = useState<number>(4);

  // Event scoping state
  const [scope, setScope] = useState<'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY'>('PUBLIC');
  const [organizationId, setOrganizationId] = useState('');
  const [gymId, setGymId] = useState('');

  // Location state
  const [country, setCountry] = useState('GB'); // Default to UK
  const [postcode, setPostcode] = useState('');

  // Event status
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('ACTIVE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const eventData = {
        name,
        description: description || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        isTeamEvent,
        teamScoringMethod: isTeamEvent ? teamScoringMethod : undefined,
        maxTeamSize: isTeamEvent ? maxTeamSize : undefined,
        scope,
        organizationId: scope === 'ORGANIZATION' ? organizationId : undefined,
        gymId: scope === 'GYM' ? gymId : undefined,
        country,
        postcode: postcode || undefined,
        status,
      };

      await api.post('/api/events', eventData);
      router.push('/admin/events');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setName(value);
    } else if (name === 'description') {
      setDescription(value);
    } else if (name === 'startDate') {
      setStartDate(value);
    } else if (name === 'endDate') {
      setEndDate(value);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
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
              <span className="text-gray-900 dark:text-white text-sm font-medium">
                Create Event
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">Create New Event</h1>
            <p className="mt-2 text-gray-400">Set up a new competition for your competitors</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                  Event Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter event name"
                  value={name}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter event description"
                  value={description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-300">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    name="startDate"
                    className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={startDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-300">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    name="endDate"
                    className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={endDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Event Scoping Settings */}
              <div className="border-t border-gray-700/50 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Event Access & Location</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="scope" className="block text-sm font-medium text-gray-300">
                      Event Scope
                    </label>
                    <select
                      id="scope"
                      value={scope}
                      onChange={(e) =>
                        setScope(
                          e.target.value as 'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY',
                        )
                      }
                      className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="PUBLIC">Public - Anyone can join</option>
                      <option value="ORGANIZATION">
                        Organization - Only specific organization members
                      </option>
                      <option value="GYM">Gym - Only specific gym members</option>
                      <option value="INVITE_ONLY">Invite Only - Only invited users</option>
                    </select>
                  </div>

                  {scope === 'ORGANIZATION' && (
                    <div>
                      <label
                        htmlFor="organizationId"
                        className="block text-sm font-medium text-gray-300"
                      >
                        Organization ID
                      </label>
                      <input
                        type="text"
                        id="organizationId"
                        value={organizationId}
                        onChange={(e) => setOrganizationId(e.target.value)}
                        className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Enter organization ID"
                      />
                    </div>
                  )}

                  {scope === 'GYM' && (
                    <div>
                      <label htmlFor="gymId" className="block text-sm font-medium text-gray-300">
                        Gym ID
                      </label>
                      <input
                        type="text"
                        id="gymId"
                        value={gymId}
                        onChange={(e) => setGymId(e.target.value)}
                        className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Enter gym ID"
                      />
                    </div>
                  )}

                  {/* Location Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-300">
                        Country
                      </label>
                      <div className="relative">
                        <select
                          id="country"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="GB">🇬🇧 United Kingdom</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="postcode" className="block text-sm font-medium text-gray-300">
                        Postcode (Optional)
                      </label>
                      <input
                        type="text"
                        id="postcode"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., SW1A 1AA"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Status */}
              <div className="border-t border-gray-700/50 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Event Status</h3>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-300">
                    Initial Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'ACTIVE')}
                    className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="ACTIVE">Active - Available to join immediately</option>
                    <option value="DRAFT">Draft - Save for later activation</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-400">
                    {status === 'ACTIVE'
                      ? 'Event will be immediately available for users to join'
                      : 'Event will be saved as draft and can be activated later from the events management page'}
                  </p>
                </div>
              </div>

              {/* Team Event Settings */}
              <div className="border-t border-gray-700/50 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Team Competition Settings</h3>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isTeamEvent"
                      checked={isTeamEvent}
                      onChange={(e) => setIsTeamEvent(e.target.checked)}
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 rounded bg-gray-700"
                    />
                    <label htmlFor="isTeamEvent" className="ml-2 block text-sm text-white">
                      Enable team competition
                    </label>
                  </div>

                  {isTeamEvent && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-700/50">
                      <div>
                        <label
                          htmlFor="teamScoringMethod"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Team Scoring Method
                        </label>
                        <select
                          id="teamScoringMethod"
                          value={teamScoringMethod}
                          onChange={(e) =>
                            setTeamScoringMethod(e.target.value as 'SUM' | 'AVERAGE' | 'BEST')
                          }
                          className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="SUM">Sum of all member scores</option>
                          <option value="AVERAGE">Average of member scores</option>
                          <option value="BEST">Best individual score</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="maxTeamSize"
                          className="block text-sm font-medium text-gray-300"
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
                          className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/admin/events')}
                  className="px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name}
                  className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
