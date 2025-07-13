'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { calculateAgeFromDateOfBirth, convertFirestoreTimestamp } from '@/lib/utils';
import { SCORING_SYSTEMS } from '@/constants/scoringSystems';

interface Activity {
  id: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  unit?: string;
  scoringSystemId?: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  bodyweight?: number;
  dateOfBirth?: Date;
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

interface ScoreSubmissionModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onScoreSubmitted: () => void;
}

export default function ScoreSubmissionModal({
  eventId,
  isOpen,
  onClose,
  onScoreSubmitted,
}: ScoreSubmissionModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [selectedCompetitor, setSelectedCompetitor] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [scoreValue, setScoreValue] = useState('');
  const [notes, setNotes] = useState('');
  const [competitorDetails, setCompetitorDetails] = useState<Participant | null>(null);
  const [competitionVerification, setCompetitionVerification] =
    useState<CompetitionVerification | null>(null);

  const fetchEventData = useCallback(async () => {
    try {
      const [eventData, activitiesData] = await Promise.all([
        api.get(`/api/events/${eventId}`),
        api.get(`/api/events/${eventId}/activities`),
      ]);

      setParticipants(eventData.participants || []);
      setActivities(activitiesData);
    } catch (error: unknown) {
      console.error('Error fetching event data:', error);
      setError('Failed to fetch event data');
    }
  }, [eventId]);

  useEffect(() => {
    if (isOpen) {
      fetchEventData();
    }
  }, [isOpen, eventId, fetchEventData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompetitor || !selectedActivity || !scoreValue) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Parse the score value based on input type
      let rawValue: number;
      if (isTimeInput()) {
        rawValue = parseTimeInput(scoreValue);
      } else {
        rawValue = Number(scoreValue);
      }

      await api.post('/api/scores', {
        eventId,
        competitorId: selectedCompetitor,
        activityId: selectedActivity,
        rawValue,
        notes,
      });

      // Reset form
      setSelectedCompetitor('');
      setSelectedActivity('');
      setScoreValue('');
      setNotes('');

      onScoreSubmitted();
      onClose();
    } catch (error: unknown) {
      console.error('Error submitting score:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit score';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityUnit = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);

    // If activity has a unit, use it
    if (activity?.unit) {
      return activity.unit;
    }

    // Fallback: get unit from scoring system
    if (activity?.scoringSystemId) {
      const scoringSystem = SCORING_SYSTEMS.find((sys) => sys.id === activity.scoringSystemId);
      return scoringSystem?.unit || '';
    }

    return '';
  };

  const getSelectedActivity = () => {
    return activities.find((a) => a.id === selectedActivity);
  };

  const isTimeInput = () => {
    const activity = getSelectedActivity();
    return activity?.unit === 'seconds';
  };

  const isWeightInput = () => {
    const activity = getSelectedActivity();
    return activity?.unit === 'kg';
  };

  const parseTimeInput = (timeStr: string): number => {
    // Handle mm:ss format (e.g., "2:30" -> 150 seconds)
    if (timeStr.includes(':')) {
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return minutes * 60 + seconds;
    }
    // Handle seconds only (e.g., "120" -> 120 seconds)
    return Number(timeStr);
  };

  const handleCompetitorChange = async (competitorId: string) => {
    setSelectedCompetitor(competitorId);
    const competitor = participants.find((p) => p.id === competitorId);
    setCompetitorDetails(competitor || null);

    // Fetch competition verification data if competitor is selected
    if (competitorId) {
      try {
        const verificationData = await api.get(`/api/events/${eventId}/competition-verification`);
        const verification = verificationData.verifications?.find(
          (v: CompetitionVerification) => v.userId === competitorId,
        );
        setCompetitionVerification(verification || null);
      } catch (error) {
        console.error('Error fetching competition verification:', error);
        setCompetitionVerification(null);
      }
    } else {
      setCompetitionVerification(null);
    }
  };

  const handleScoreChange = (value: string) => {
    if (isTimeInput()) {
      // For time input, allow mm:ss format
      setScoreValue(value);
    } else {
      // For other inputs, only allow numbers
      setScoreValue(value.replace(/[^0-9.]/g, ''));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Submit Score</h3>

          {error && (
            <div className="mb-4 p-3 bg-error-100 border border-error-400 text-error-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="competitor"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Competitor *
              </label>
              <select
                id="competitor"
                value={selectedCompetitor}
                onChange={(e) => handleCompetitorChange(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
              >
                <option value="">Select a competitor</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name} ({participant.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Competitor Details */}
            {competitorDetails && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Competitor Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Profile Weight:</span>
                    <span className="ml-1 text-gray-900 dark:text-white">
                      {competitorDetails.bodyweight
                        ? `${competitorDetails.bodyweight}kg`
                        : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Competition Weight:</span>
                    <span
                      className={`ml-1 ${competitionVerification?.status === 'VERIFIED' ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-900 dark:text-white'}`}
                    >
                      {competitionVerification?.status === 'VERIFIED'
                        ? `${competitionVerification.bodyweight}kg`
                        : 'Not weighed in'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Age:</span>
                    <span className="ml-1 text-gray-900 dark:text-white">
                      {competitorDetails.dateOfBirth
                        ? (() => {
                            const birthDate = convertFirestoreTimestamp(
                              competitorDetails.dateOfBirth,
                            );
                            const calculatedAge = birthDate
                              ? calculateAgeFromDateOfBirth(birthDate)
                              : null;
                            return calculatedAge || 'Not set';
                          })()
                        : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Sex:</span>
                    <span className="ml-1 text-gray-900 dark:text-white">
                      {competitorDetails.sex || 'Not set'}
                    </span>
                  </div>
                </div>
                {competitionVerification?.status === 'VERIFIED' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✅ Score will be calculated using competition weight (
                    {competitionVerification.bodyweight}kg)
                  </p>
                )}
                {(!competitorDetails.bodyweight ||
                  !competitorDetails.dateOfBirth ||
                  !competitorDetails.sex) && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    ⚠️ Missing competitor details may affect scoring calculation
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="activity"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Workout *
              </label>
              <select
                id="activity"
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
              >
                <option value="">Select a workout</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="score"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Score *
                {selectedActivity && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    ({getActivityUnit(selectedActivity)})
                  </span>
                )}
              </label>
              <div className="mt-1 relative">
                <input
                  type={isTimeInput() ? 'text' : 'number'}
                  id="score"
                  value={scoreValue}
                  onChange={(e) => handleScoreChange(e.target.value)}
                  required
                  step={isTimeInput() ? undefined : '0.01'}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                  placeholder={
                    isTimeInput()
                      ? 'Enter time (e.g., 2:30 or 150)'
                      : isWeightInput()
                        ? 'Enter weight in kg'
                        : 'Enter score'
                  }
                />
                {selectedActivity && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {getActivityUnit(selectedActivity)}
                    </span>
                  </div>
                )}
              </div>
              {selectedActivity && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {isTimeInput()
                    ? 'Enter time as mm:ss (e.g., 2:30) or seconds (e.g., 150)'
                    : isWeightInput()
                      ? `Enter weight in ${getActivityUnit(selectedActivity)}`
                      : `Enter score in ${getActivityUnit(selectedActivity)}`}
                </p>
              )}
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                placeholder="Add any notes about this score..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
              >
                {isLoading ? 'Submitting...' : 'Submit Score'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
