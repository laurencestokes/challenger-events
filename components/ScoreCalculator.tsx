'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import { SCORING_SYSTEMS } from '@/constants/scoringSystems';
import { calculateAgeFromDateOfBirth, convertFirestoreTimestamp } from '@/lib/utils';

interface Activity {
  id: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  unit?: string;
  scoringSystemId?: string;
  reps?: number;
}

interface ScoreCalculatorProps {
  activities: Activity[];
}

interface CalculatorState {
  [activityId: string]: {
    value: number;
    score: number | null;
    loading: boolean;
    error: string | null;
  };
}

export default function ScoreCalculator({ activities }: ScoreCalculatorProps) {
  const { user } = useAuth();
  const [calculatorState, setCalculatorState] = useState<CalculatorState>({});
  const [userProfile, setUserProfile] = useState({
    bodyweight: 70,
    age: 25,
    sex: 'M' as 'M' | 'F',
  });

  // Store timeout IDs for proper debouncing
  const timeoutRefs = useRef<{ [activityId: string]: NodeJS.Timeout | null }>({});

  // Initialize calculator state for each activity
  useEffect(() => {
    const initialState: CalculatorState = {};
    activities.forEach((activity) => {
      const defaultValue = getDefaultValue(activity);
      initialState[activity.id] = {
        value: defaultValue,
        score: null,
        loading: false,
        error: null,
      };
    });
    setCalculatorState(initialState);
  }, [activities]);

  // Set user profile from auth context
  useEffect(() => {
    if (user) {
      const age = user.dateOfBirth
        ? (() => {
            const birthDate = convertFirestoreTimestamp(user.dateOfBirth);
            return birthDate ? calculateAgeFromDateOfBirth(birthDate) : 25;
          })()
        : 25;

      setUserProfile({
        bodyweight: user.bodyweight || 70,
        age: age,
        sex: user.sex || 'M',
      });
    }
  }, [user]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      const timeouts = Object.values(timeoutRefs.current);
      timeouts.forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const getDefaultValue = (activity: Activity): number => {
    switch (activity.unit) {
      case 'kg':
        return 100; // Default weight
      case 'seconds':
        return 120; // Default time (2 minutes)
      default:
        return 10;
    }
  };

  const getMinMaxValues = (activity: Activity): { min: number; max: number } => {
    switch (activity.unit) {
      case 'kg':
        return { min: 20, max: 300 };
      case 'seconds':
        return { min: 60, max: 300 }; // 1-5 minutes
      default:
        return { min: 1, max: 100 };
    }
  };

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'seconds') {
      const minutes = Math.floor(value / 60);
      const seconds = Math.floor(value % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const parseTimeInput = (timeStr: string): number => {
    if (timeStr.includes(':')) {
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return minutes * 60 + seconds;
    }
    return Number(timeStr);
  };

  const calculateScore = async (activityId: string, value: number) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity?.scoringSystemId) return;

    setCalculatorState((prev) => ({
      ...prev,
      [activityId]: { ...prev[activityId], loading: true, error: null },
    }));

    try {
      // For rep-based strength exercises, calculate 1RM first
      let valueForScoring = value;
      if (activity.reps && activity.reps > 1) {
        const { epleyFormula } = await import('@/utils/scoring');
        valueForScoring = epleyFormula(value, activity.reps);
      }

      const response = await api.post('/api/calculate-score', {
        scoringSystemId: activity.scoringSystemId,
        value: valueForScoring,
        bodyweight: userProfile.bodyweight,
        age: userProfile.age,
        sex: userProfile.sex,
        reps: activity.reps,
      });

      setCalculatorState((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          score: response.score,
          loading: false,
          error: null,
        },
      }));
    } catch (error) {
      console.error('Error calculating score:', error);
      setCalculatorState((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          loading: false,
          error: 'Failed to calculate score',
        },
      }));
    }
  };

  const handleValueChange = (activityId: string, newValue: number) => {
    setCalculatorState((prev) => ({
      ...prev,
      [activityId]: { ...prev[activityId], value: newValue },
    }));

    // Clear existing timeout for this activity
    if (timeoutRefs.current[activityId]) {
      clearTimeout(timeoutRefs.current[activityId]!);
    }

    // Set new timeout for debounced calculation
    timeoutRefs.current[activityId] = setTimeout(() => {
      calculateScore(activityId, newValue);
      timeoutRefs.current[activityId] = null;
    }, 500); // Increased debounce time for better UX
  };

  const handleTimeInputChange = (activityId: string, timeStr: string) => {
    const seconds = parseTimeInput(timeStr);
    if (!isNaN(seconds) && seconds > 0) {
      handleValueChange(activityId, seconds);
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

  return (
    <div className="space-y-6">
      {/* User Profile Display */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Your Profile</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Bodyweight:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {userProfile.bodyweight} kg
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Age:</span>
            <div className="font-medium text-gray-900 dark:text-white">{userProfile.age} years</div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Sex:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {userProfile.sex === 'M' ? 'Male' : 'Female'}
            </div>
          </div>
        </div>
        {(!userProfile.bodyweight || userProfile.age === 25) && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            ⚠️ Update your profile for accurate scoring
          </p>
        )}
      </div>

      {/* Activity Calculators */}
      <div className="space-y-4">
        {activities.map((activity) => {
          const state = calculatorState[activity.id];
          const unit = getActivityUnit(activity.id);
          const { min, max } = getMinMaxValues(activity);
          const isTimeInput = unit === 'seconds';

          if (!state) return null;

          return (
            <div
              key={activity.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                {activity.name}
              </h3>

              {/* Input Section */}
              <div className="mb-3">
                {isTimeInput ? (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Time (mm:ss)
                    </label>
                    <input
                      type="text"
                      value={formatValue(state.value, unit)}
                      onChange={(e) => handleTimeInputChange(activity.id, e.target.value)}
                      placeholder="2:30"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Value ({unit})
                    </label>
                    <input
                      type="number"
                      value={state.value}
                      onChange={(e) => handleValueChange(activity.id, Number(e.target.value))}
                      min={min}
                      max={max}
                      step={unit === 'kg' ? 2.5 : 1}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Slider */}
                <div className="mt-2">
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={state.value}
                    onChange={(e) => handleValueChange(activity.id, Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{formatValue(min, unit)}</span>
                    <span>{formatValue(max, unit)}</span>
                  </div>
                </div>
              </div>

              {/* Score Display */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                {state.loading ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Calculating...</div>
                ) : state.error ? (
                  <div className="text-sm text-red-600 dark:text-red-400">{state.error}</div>
                ) : state.score !== null ? (
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      Score: {state.score.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Target: {formatValue(state.value, unit)}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Enter a value to calculate score
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
