import React, { useState } from 'react';
import { EVENT_TYPES } from '@/constants/eventTypes';
import { api } from '@/lib/api-client';

interface AddScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScoreAdded: () => void;
  initialActivityId?: string;
}

export default function AddScoreModal({
  isOpen,
  onClose,
  onScoreAdded,
  initialActivityId,
}: AddScoreModalProps) {
  const [activityId, setActivityId] = useState(initialActivityId || '');
  const [rawValue, setRawValue] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset activityId when modal opens/closes or initialActivityId changes
  React.useEffect(() => {
    if (isOpen) {
      setActivityId(initialActivityId || '');
      setReps('');
    }
  }, [isOpen, initialActivityId]);

  if (!isOpen) return null;

  const selectedActivity = EVENT_TYPES.find((a) => a.id === activityId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!activityId || !rawValue) {
        setError('Please select a test and enter a value.');
        setIsLoading(false);
        return;
      }

      // Validate reps if the activity supports them
      if (selectedActivity?.supportsReps && reps) {
        const repsNum = Number(reps);
        if (
          isNaN(repsNum) ||
          repsNum < (selectedActivity.minReps || 1) ||
          repsNum > (selectedActivity.maxReps || 10)
        ) {
          setError(
            `Reps must be between ${selectedActivity.minReps || 1} and ${selectedActivity.maxReps || 10}`,
          );
          setIsLoading(false);
          return;
        }
      }

      await api.post('/api/user/scores', {
        activityId,
        rawValue,
        reps: selectedActivity?.supportsReps && reps ? Number(reps) : undefined,
        notes,
      });
      setActivityId('');
      setRawValue('');
      setReps('');
      setNotes('');
      onScoreAdded();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to add score');
      } else {
        setError('Failed to add score');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          onClick={onClose}
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Add Personal Score
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Test
            </label>
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select a test...</option>
              {EVENT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          {selectedActivity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {selectedActivity.inputType === 'WEIGHT' && 'Weight (kg)'}
                {selectedActivity.inputType === 'TIME' && 'Time (seconds)'}
                {selectedActivity.inputType === 'DISTANCE' && 'Distance (m)'}
              </label>
              <input
                type="number"
                step="any"
                value={rawValue}
                onChange={(e) => setRawValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          )}
          {selectedActivity?.supportsReps && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reps (optional)
              </label>
              <input
                type="number"
                min={selectedActivity.minReps || 1}
                max={selectedActivity.maxReps || 10}
                placeholder={`${selectedActivity.defaultReps || 1} (default)`}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty for 1RM. Range: {selectedActivity.minReps || 1}-
                {selectedActivity.maxReps || 10}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Score'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
