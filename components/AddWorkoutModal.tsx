'use client';

import { useState } from 'react';
import { api } from '../lib/api-client';
import { EVENT_TYPES, EventType } from '../constants/eventTypes';
import { FiX, FiPlus } from 'react-icons/fi';

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

interface AddWorkoutModalProps {
  eventId: string;
  onClose: () => void;
  onWorkoutAdded: (activity: Activity) => void;
}

export default function AddWorkoutModal({
  eventId,
  onClose,
  onWorkoutAdded,
}: AddWorkoutModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [reps, setReps] = useState<number>(1);
  const [isHidden, setIsHidden] = useState(false);

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
        isHidden,
      };

      const newActivity = await api.post(`/api/events/${eventId}/activities`, activityData);
      onWorkoutAdded(newActivity);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add workout';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <FiPlus className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-white text-xl font-bold">Add Workout</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="eventType" className="block text-gray-300 text-sm font-medium mb-2">
              Event Type *
            </label>
            <select
              id="eventType"
              value={selectedEventType?.id || ''}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              <label htmlFor="reps" className="block text-gray-300 text-sm font-medium mb-2">
                Number of Reps
              </label>
              <select
                id="reps"
                value={reps}
                onChange={(e) => setReps(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((rep) => (
                  <option key={rep} value={rep}>
                    {rep} {rep === 1 ? 'rep' : 'reps'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Your weight will be converted to estimated 1RM using the Epley formula for scoring.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-gray-300 text-sm font-medium mb-2">
              Workout Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Custom name (optional)"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-gray-300 text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center">
            <input
              id="isHidden"
              type="checkbox"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 bg-gray-700 rounded"
            />
            <label htmlFor="isHidden" className="ml-2 block text-sm text-gray-300">
              Hidden Workout
            </label>
          </div>
          {isHidden && (
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                ⚠️ This workout will be hidden from competitors until you reveal it during the
                event.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedEventType}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <FiPlus className="w-4 h-4" />
                  <span>Add Workout</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
