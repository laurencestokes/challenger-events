'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import { SCORING_SYSTEMS } from '@/constants/scoringSystems';
import { convertFirestoreTimestamp } from '@/lib/utils';

interface Activity {
  id: string;
  name: string;
  description?: string;
  type: 'TIME' | 'REPS' | 'WEIGHT' | 'DISTANCE' | 'CUSTOM';
  unit?: string;
  scoringSystemId?: string;
  reps?: number;
}

interface CompetitionVerification {
  bodyweight: number;
  status: string;
  verifiedAt?: string | Date;
}

interface ScoreCalculatorProps {
  activities: Activity[];
  userProfileOverride?: {
    bodyweight: number;
    dateOfBirth?: unknown;
    sex: 'M' | 'F';
    competitionVerification?: CompetitionVerification | null;
    profileBodyweight?: number;
  };
}

interface CalculatorState {
  [activityId: string]: {
    value: number;
    inputValue: string; // For time inputs, store the raw input string
    score: number | null;
    loading: boolean;
    error: string | null;
  };
}

export default function ScoreCalculator({ activities, userProfileOverride }: ScoreCalculatorProps) {
  const { user } = useAuth();
  const [calculatorState, setCalculatorState] = useState<CalculatorState>({});
  const [userProfile, setUserProfile] = useState({
    bodyweight: 70,
    dateOfBirth: undefined as unknown,
    sex: 'M' as 'M' | 'F',
    competitionVerification: null as CompetitionVerification | null,
    profileBodyweight: undefined as number | undefined,
  });

  // Store timeout IDs for proper debouncing
  const timeoutRefs = useRef<{ [activityId: string]: NodeJS.Timeout | null }>({});

  // Initialize calculator state for each activity
  useEffect(() => {
    const initialState: CalculatorState = {};
    activities.forEach((activity) => {
      const defaultValue = getDefaultValue(activity);
      const unit = getActivityUnit(activity.id);
      initialState[activity.id] = {
        value: defaultValue,
        inputValue: unit === 'seconds' ? formatValue(defaultValue, unit) : defaultValue.toString(),
        score: null,
        loading: false,
        error: null,
      };
    });
    setCalculatorState(initialState);
  }, [activities]);

  // Set user profile from auth context or override
  useEffect(() => {
    if (userProfileOverride) {
      setUserProfile({
        bodyweight: userProfileOverride.bodyweight,
        dateOfBirth: userProfileOverride.dateOfBirth,
        sex: userProfileOverride.sex,
        competitionVerification: userProfileOverride.competitionVerification || null,
        profileBodyweight:
          typeof userProfileOverride.profileBodyweight === 'number'
            ? userProfileOverride.profileBodyweight
            : undefined,
      });
    } else if (user) {
      setUserProfile({
        bodyweight: user.bodyweight || 70,
        dateOfBirth: user.dateOfBirth,
        sex: user.sex || 'M',
        competitionVerification: null,
        profileBodyweight: typeof user.bodyweight === 'number' ? user.bodyweight : undefined,
      });
    }
  }, [user, userProfileOverride]);

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
    // Check for specific activity types first
    if (activity.scoringSystemId === 'rowing_4min') {
      return 1000; // Default 4-minute row distance: 1000m
    }

    if (activity.scoringSystemId === 'rowing_500m_distance') {
      return 300; // Default 500m row distance: 300m
    }

    // Generic defaults based on unit
    switch (activity.unit) {
      case 'kg':
        return 100; // Default weight
      case 'seconds':
        return 120; // Default time (2 minutes)
      case 'm':
        return 500; // Default distance in meters
      default:
        return 10;
    }
  };

  const getMinMaxValues = (activity: Activity): { min: number; max: number } => {
    // Check for specific activity types first
    if (activity.scoringSystemId === 'rowing_4min') {
      return { min: 100, max: 1800 }; // 4-minute row: 100m to 1800m
    }

    // Check for other specific activity types
    if (activity.scoringSystemId === 'rowing_500m_distance') {
      return { min: 100, max: 500 }; // 500m row distance: 100m to 500m
    }

    // Generic ranges based on unit
    switch (activity.unit) {
      case 'kg':
        return { min: 20, max: 300 };
      case 'seconds':
        return { min: 60, max: 300 }; // 1-5 minutes
      case 'm':
        return { min: 50, max: 2000 }; // Distance in meters
      default:
        return { min: 1, max: 100 };
    }
  };

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'seconds') {
      const minutes = Math.floor(value / 60);
      const seconds = Math.floor(value % 60);
      const milliseconds = Math.round((value % 1) * 10); // Get tenths of seconds
      if (milliseconds > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const parseTimeInput = (timeStr: string): number => {
    if (timeStr.includes(':')) {
      const [minutes, secondsPart] = timeStr.split(':');
      const minutesNum = Number(minutes);

      // Handle seconds with optional milliseconds
      let secondsNum = 0;
      if (secondsPart.includes('.')) {
        const [seconds, milliseconds] = secondsPart.split('.');
        secondsNum = Number(seconds) + Number(milliseconds) / 10;
      } else {
        secondsNum = Number(secondsPart);
      }

      return minutesNum * 60 + secondsNum;
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
      const response = await api.post('/api/calculate-score', {
        scoringSystemId: activity.scoringSystemId,
        value,
        bodyweight: userProfile.bodyweight,
        dateOfBirth: userProfile.dateOfBirth,
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
    const unit = getActivityUnit(activityId);
    setCalculatorState((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        value: newValue,
        inputValue: unit === 'seconds' ? formatValue(newValue, unit) : newValue.toString(),
      },
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
    // Update the input value immediately for responsive typing
    setCalculatorState((prev) => ({
      ...prev,
      [activityId]: { ...prev[activityId], inputValue: timeStr },
    }));

    const seconds = parseTimeInput(timeStr);
    if (!isNaN(seconds) && seconds > 0) {
      // Update the actual value and trigger calculation
      setCalculatorState((prev) => ({
        ...prev,
        [activityId]: { ...prev[activityId], value: seconds },
      }));

      // Clear existing timeout for this activity
      if (timeoutRefs.current[activityId]) {
        clearTimeout(timeoutRefs.current[activityId]!);
      }

      // Set new timeout for debounced calculation
      timeoutRefs.current[activityId] = setTimeout(() => {
        calculateScore(activityId, seconds);
        timeoutRefs.current[activityId] = null;
      }, 500);
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
              {userProfile.competitionVerification &&
                userProfile.competitionVerification.bodyweight && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                    (Competition weigh-in)
                  </span>
                )}
            </div>
            {userProfile.competitionVerification &&
              userProfile.profileBodyweight &&
              userProfile.competitionVerification.bodyweight !== userProfile.profileBodyweight && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Profile weight: {userProfile.profileBodyweight} kg
                </div>
              )}
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Sex:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {userProfile.sex === 'M' ? 'Male' : 'Female'}
            </div>
          </div>
        </div>
        {userProfile.competitionVerification &&
          userProfile.competitionVerification.status === 'VERIFIED' && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              ✅ Competition weigh-in verified. All calculations use this weight.
            </p>
          )}
        {(!userProfile.bodyweight || userProfile.dateOfBirth === undefined) && (
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
                      Time (mm:ss.ms)
                    </label>
                    <input
                      type="text"
                      value={state.inputValue}
                      onChange={(e) => handleTimeInputChange(activity.id, e.target.value)}
                      placeholder="1:30.5"
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
