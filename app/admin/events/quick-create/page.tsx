'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import { EVENT_TYPES, getEventTypesByCategory } from '@/constants/eventTypes';

export default function QuickCreateEvent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [activityReps, setActivityReps] = useState<Record<string, number>>({});
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [teamScoringMethod, setTeamScoringMethod] = useState<'SUM' | 'AVERAGE' | 'BEST'>('SUM');
  const [maxTeamSize, setMaxTeamSize] = useState<number>(4);
  const [scope, setScope] = useState<'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY'>(
    'INVITE_ONLY',
  );
  const [organizationId, setOrganizationId] = useState('');
  const [gymId, setGymId] = useState('');
  const [country, setCountry] = useState('GB');
  const [postcode, setPostcode] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const strengthActivities = getEventTypesByCategory('STRENGTH');
  const enduranceActivities = getEventTypesByCategory('ENDURANCE');

  const createEventMutation = useMutation({
    mutationFn: async (eventData: object) => {
      const createdEvent = await api.post('/api/events', eventData);

      // Create activities for the event
      const activityPromises = selectedActivities.map((activityId, index) => {
        const eventType = EVENT_TYPES.find((et) => et.id === activityId);
        if (!eventType) return null;

        const reps = eventType.supportsReps
          ? activityReps[activityId] || eventType.defaultReps || 1
          : undefined;

        return api.post(`/api/events/${createdEvent.id}/activities`, {
          name: eventType.name,
          description: eventType.description,
          type:
            eventType.inputType === 'WEIGHT'
              ? 'WEIGHT'
              : eventType.inputType === 'TIME'
                ? 'TIME'
                : 'DISTANCE',
          scoringSystemId: eventType.scoringSystemId,
          unit: eventType.unit,
          reps: reps,
          order: index,
          isHidden: false,
        });
      });

      await Promise.all(activityPromises.filter(Boolean));
      return createdEvent;
    },
    onSuccess: (createdEvent) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.available() });
      router.push(`/admin/events/${createdEvent.id}/participants`);
    },
    onError: (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
    },
  });

  const isLoading = createEventMutation.isPending;

  const handleActivityToggle = (activityId: string) => {
    setSelectedActivities((prev) => {
      const isSelected = prev.includes(activityId);
      if (isSelected) {
        // Remove activity and its reps
        const newReps = { ...activityReps };
        delete newReps[activityId];
        setActivityReps(newReps);
        return prev.filter((id) => id !== activityId);
      } else {
        // Add activity with default reps
        const eventType = EVENT_TYPES.find((et) => et.id === activityId);
        if (eventType?.supportsReps) {
          setActivityReps({
            ...activityReps,
            [activityId]: eventType.defaultReps || 1,
          });
        }
        return [...prev, activityId];
      }
    });
  };

  const handleRepsChange = (activityId: string, reps: number) => {
    setActivityReps({ ...activityReps, [activityId]: reps });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name) {
      setError('Event name is required');
      return;
    }

    if (selectedActivities.length === 0) {
      setError('Please select at least one activity');
      return;
    }

    const eventData = {
      name,
      description: description || undefined,
      isTeamEvent,
      teamScoringMethod: isTeamEvent ? teamScoringMethod : undefined,
      maxTeamSize: isTeamEvent ? maxTeamSize : undefined,
      scope,
      organizationId: scope === 'ORGANIZATION' ? organizationId : undefined,
      gymId: scope === 'GYM' ? gymId : undefined,
      country,
      postcode: postcode || undefined,
      status,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    };

    createEventMutation.mutate(eventData);
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
                Quick Create Event
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">Quick Create Event</h1>
            <p className="mt-2 text-gray-400">
              Create an on-the-fly competition and add participants on the day
            </p>
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
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter event description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Activity Selection */}
              <div className="border-t border-gray-700/50 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  Select Activities * (Select at least one)
                </h3>

                <div className="space-y-6">
                  {/* Strength Activities */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Strength</h4>
                    <div className="space-y-3">
                      {strengthActivities.map((activity) => {
                        const isSelected = selectedActivities.includes(activity.id);
                        return (
                          <div
                            key={activity.id}
                            className={`p-3 rounded-lg border transition-colors ${
                              isSelected
                                ? 'bg-orange-500/20 border-orange-500'
                                : 'bg-gray-700/50 border-gray-600'
                            }`}
                          >
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleActivityToggle(activity.id)}
                                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 rounded bg-gray-700"
                              />
                              <div className="ml-3 flex-1">
                                <div className="text-sm font-medium text-white">
                                  {activity.name}
                                </div>
                                <div className="text-xs text-gray-400">{activity.unit}</div>
                              </div>
                            </label>
                            {isSelected && activity.supportsReps && (
                              <div className="mt-3 ml-7">
                                <label
                                  htmlFor={`reps-${activity.id}`}
                                  className="block text-xs text-gray-300 mb-1"
                                >
                                  Reps
                                </label>
                                <input
                                  type="number"
                                  id={`reps-${activity.id}`}
                                  min={activity.minReps || 1}
                                  max={activity.maxReps || 10}
                                  value={activityReps[activity.id] || activity.defaultReps || 1}
                                  onChange={(e) =>
                                    handleRepsChange(activity.id, Number(e.target.value))
                                  }
                                  className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Endurance Activities */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Endurance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {enduranceActivities.map((activity) => (
                        <label
                          key={activity.id}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedActivities.includes(activity.id)
                              ? 'bg-orange-500/20 border-orange-500'
                              : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedActivities.includes(activity.id)}
                            onChange={() => handleActivityToggle(activity.id)}
                            className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 rounded bg-gray-700"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-white">{activity.name}</div>
                            <div className="text-xs text-gray-400">{activity.unit}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Settings */}
              <div className="border-t border-gray-700/50 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Event Settings</h3>

                <div className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="scope" className="block text-sm font-medium text-gray-300 mb-1">
                      Event Scope *
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
                      <option value="INVITE_ONLY">Invite Only - Only invited users</option>
                      <option value="PUBLIC">Public - Anyone can join</option>
                      <option value="ORGANIZATION">
                        Organization - Only specific organization members
                      </option>
                      <option value="GYM">Gym - Only specific gym members</option>
                    </select>
                  </div>

                  {scope === 'ORGANIZATION' && (
                    <div>
                      <label
                        htmlFor="organizationId"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Organization ID *
                      </label>
                      <input
                        type="text"
                        id="organizationId"
                        value={organizationId}
                        onChange={(e) => setOrganizationId(e.target.value)}
                        required={scope === 'ORGANIZATION'}
                        className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Enter organization ID"
                      />
                    </div>
                  )}

                  {scope === 'GYM' && (
                    <div>
                      <label
                        htmlFor="gymId"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Gym ID *
                      </label>
                      <input
                        type="text"
                        id="gymId"
                        value={gymId}
                        onChange={(e) => setGymId(e.target.value)}
                        required={scope === 'GYM'}
                        className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Enter gym ID"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="country"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Country
                      </label>
                      <select
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="GB">🇬🇧 United Kingdom</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="postcode"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
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

                  <div>
                    <label
                      htmlFor="status"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Event Status
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="startDate"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Start Date (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="endDate"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        End Date (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
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
                  disabled={isLoading || !name || selectedActivities.length === 0}
                  className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Event & Add Participants'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
