'use client';

import { useState } from 'react';
import { api } from '../lib/api-client';

interface Activity {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  scoringSystemId?: string;
  unit?: string;
  order: number;
  createdAt: Date;
}

interface ScoringSystem {
  id: string;
  name: string;
  description: string;
  category: 'STRENGTH' | 'ENDURANCE' | 'MIXED';
  inputType: 'WEIGHT' | 'TIME' | 'DISTANCE' | 'REPS' | 'CUSTOM';
  unit?: string;
  requiresBodyweight: boolean;
  requiresAge: boolean;
  requiresSex: boolean;
  calculationFunction: string;
}

interface EditWorkoutModalProps {
  activity: Activity;
  eventId: string;
  scoringSystems: ScoringSystem[];
  onClose: () => void;
  onWorkoutUpdated: (updatedActivity: Activity) => void;
}

export default function EditWorkoutModal({
  activity,
  eventId,
  scoringSystems,
  onClose,
  onWorkoutUpdated,
}: EditWorkoutModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState(activity.name);
  const [description, setDescription] = useState(activity.description || '');
  const [type, setType] = useState<'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM'>(
    activity.type,
  );
  const [scoringSystemId, setScoringSystemId] = useState<string>(activity.scoringSystemId || '');
  const [unit, setUnit] = useState<string>(activity.unit || '');

  // Filter scoring systems based on selected type
  const filteredScoringSystems = scoringSystems.filter((system) => system.inputType === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const activityData = {
        name,
        description: description || undefined,
        type,
        scoringSystemId: scoringSystemId || undefined,
        unit: unit || undefined,
        order: activity.order,
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

  const handleTypeChange = (newType: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM') => {
    setType(newType);
    // Only reset scoring system if the new type doesn't support the current one
    if (!filteredScoringSystems.find((sys) => sys.id === scoringSystemId)) {
      setScoringSystemId('');
    }
    setUnit(''); // Reset unit when type changes
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Workout</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Workout Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                placeholder="e.g., Back Squat, 2km Row"
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
                placeholder="Optional description of the workout"
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Input Type *
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) =>
                  handleTypeChange(
                    e.target.value as 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM',
                  )
                }
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
              >
                <option value="WEIGHT">Weight (kg)</option>
                <option value="TIME">Time (mm:ss)</option>
                <option value="REPS">Reps</option>
                <option value="DISTANCE">Distance (m)</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="scoringSystem"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Scoring System
              </label>
              <select
                id="scoringSystem"
                value={scoringSystemId}
                onChange={(e) => setScoringSystemId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
              >
                <option value="">No scoring system</option>
                {filteredScoringSystems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name} - {system.description}
                  </option>
                ))}
              </select>
              {filteredScoringSystems.length === 0 && type !== 'CUSTOM' && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  No scoring systems available for this input type.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="unit"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Unit
              </label>
              <input
                type="text"
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                placeholder={
                  type === 'WEIGHT'
                    ? 'kg'
                    : type === 'TIME'
                      ? 'mm:ss'
                      : type === 'REPS'
                        ? 'reps'
                        : type === 'DISTANCE'
                          ? 'm'
                          : 'unit'
                }
              />
            </div>

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
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
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
