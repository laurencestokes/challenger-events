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
      <div className="relative top-20 mx-auto p-5 w-96 rounded-md panel">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-text-primary mb-4">Edit Workout</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="eventType" className="block text-sm font-medium text-text-secondary">
                Event Type *
              </label>
              <select
                id="eventType"
                value={selectedEventType?.id || ''}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
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
                <label htmlFor="reps" className="block text-sm font-medium text-text-secondary">
                  Number of Reps
                </label>
                <select
                  id="reps"
                  value={reps}
                  onChange={(e) => setReps(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((rep) => (
                    <option key={rep} value={rep}>
                      {rep} {rep === 1 ? 'rep' : 'reps'}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-text-secondary">
                  Your weight will be converted to estimated 1RM using the Epley formula for
                  scoring.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary">
                Workout Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
                placeholder="Custom name (optional)"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-text-secondary"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center">
              <input
                id="isHidden"
                type="checkbox"
                checked={isHidden}
                onChange={(e) => setIsHidden(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
              />
              <label htmlFor="isHidden" className="ml-2 block text-sm text-text-secondary">
                Hidden Workout
              </label>
            </div>
            {isHidden && (
              <p className="text-xs text-yellow-400">
                ⚠️ This workout will be hidden from competitors until you reveal it during the
                event.
              </p>
            )}

            {error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-high border border-border rounded-md hover:bg-surface-high"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedEventType}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
