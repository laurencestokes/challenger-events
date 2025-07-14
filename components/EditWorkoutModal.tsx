'use client';

import { useState } from 'react';
import { api } from '../lib/api-client';
import { EVENT_TYPES, EventType } from '../constants/eventTypes';

interface Activity {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  scoringSystemId?: string;
  unit?: string;
  order: number;
  isHidden?: boolean;
  revealedAt?: Date;
  createdAt: Date;
}

interface EditWorkoutModalProps {
  activity: Activity;
  eventId: string;
  onClose: () => void;
  onWorkoutUpdated: (updatedActivity: Activity) => void;
}

export default function EditWorkoutModal({
  activity,
  eventId,
  onClose,
  onWorkoutUpdated,
}: EditWorkoutModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState(activity.name);
  const [description, setDescription] = useState(activity.description || '');
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(() => {
    // Find the event type that matches the current activity
    return EVENT_TYPES.find((type) => type.scoringSystemId === activity.scoringSystemId) || null;
  });
  const [reps, setReps] = useState<number>(1);
  const [isHidden, setIsHidden] = useState(activity.isHidden || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!selectedEventType) {
      setError('Please select an event type');
      setIsLoading(false);
      return;
    }

    try {
      const activityData = {
        name: name || selectedEventType.name,
        description: description || selectedEventType.description,
        type: selectedEventType.inputType,
        scoringSystemId: selectedEventType.scoringSystemId,
        unit: selectedEventType.unit,
        reps: selectedEventType.supportsReps ? reps : undefined,
        order: activity.order,
        isHidden,
      };

      await api.put(`/api/events/${eventId}/activities/${activity.id}`, activityData);

      const updatedActivity = {
        ...activity,
        ...activityData,
      };

      onWorkoutUpdated(updatedActivity);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update workout';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventTypeChange = (eventTypeId: string) => {
    const eventType = EVENT_TYPES.find((type) => type.id === eventTypeId);
    setSelectedEventType(eventType || null);
    if (eventType) {
      setName(eventType.name);
      setDescription(eventType.description);
      setReps(eventType.defaultReps || 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Workout</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="eventType"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Event Type *
              </label>
              <select
                id="eventType"
                value={selectedEventType?.id || ''}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
              >
                <option value="">Select an event type</option>
                {EVENT_TYPES.map((eventType) => (
                  <option key={eventType.id} value={eventType.id}>
                    {eventType.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedEventType?.supportsReps && (
              <div>
                <label
                  htmlFor="reps"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Number of Reps
                </label>
                <select
                  id="reps"
                  value={reps}
                  onChange={(e) => setReps(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((rep) => (
                    <option key={rep} value={rep}>
                      {rep} {rep === 1 ? 'rep' : 'reps'}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your weight will be converted to estimated 1RM using the Epley formula for
                  scoring.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Workout Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                placeholder="Custom name (optional)"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center">
              <input
                id="isHidden"
                type="checkbox"
                checked={isHidden}
                onChange={(e) => setIsHidden(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isHidden"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Hidden Workout
              </label>
            </div>
            {isHidden && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ This workout will be hidden from competitors until you reveal it during the
                event.
              </p>
            )}

            {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedEventType}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update Workout'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
