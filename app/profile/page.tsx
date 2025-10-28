'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api, getUserScores } from '../../lib/api-client';
import WelcomeSection from '@/components/WelcomeSection';
import { computeTotalsFromScores } from '@/lib/score-totals';
import { convertFirestoreTimestamp, calculateAgeFromDateOfBirth } from '../../lib/utils';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { EVENT_TYPES } from '@/constants/eventTypes';
import type { Score, Team as BaseTeam } from '@/lib/firestore';
import { beautifyRawScore } from '@/utils/scoring';
import Link from 'next/link';
import Image from 'next/image';
import { FiPlus, FiUsers, FiClock } from 'react-icons/fi';

interface Team extends BaseTeam {
  userRole?: 'CAPTAIN' | 'MEMBER' | null;
  isMember?: boolean;
  logoUrl?: string;
}
import {
  TeamCardSkeleton,
  ProfileInfoSkeleton,
  VerificationStatusSkeleton,
  ScoresListSkeleton,
} from '@/components/SkeletonLoaders';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMPETITOR';
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: 'M' | 'F';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNotes?: string;
  verifiedAt?: unknown;
  createdAt: unknown;
  publicProfileEnabled?: boolean;
  publicProfileShowAge?: boolean;
  publicProfileShowBodyweight?: boolean;
  publicProfileShowSex?: boolean;
  profileName?: string;
}

interface EventWithScores {
  id: string;
  name: string;
  code: string;
  status: string;
  joinedAt: unknown;
  score?: number;
  scores?: Score[];
}

interface EnrichedScore {
  id: string;
  eventId?: string | null;
  eventName?: string | null;
  activityId: string;
  activityName?: string | null;
  rawScore: number; // Note: all-scores endpoint uses rawScore instead of rawValue
  rawValue?: number; // For PerformanceGraph compatibility
  calculatedScore: number;
  reps?: number;
  timestamp: unknown; // Note: all-scores endpoint uses timestamp instead of submittedAt
  submittedAt?: unknown; // For PerformanceGraph compatibility
  testId?: string;
  verified?: boolean; // Whether the score is verified
  notes?: string;
  workoutName?: string;
  event?: EventWithScores; // Event context for verification
}

// Zod schema for validation
const today = new Date();
const minBirthDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
const maxBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bodyweight: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 40 && num <= 250;
  }, 'Bodyweight must be between 40kg and 250kg'),
  dateOfBirth: z
    .string()
    .transform((val) => {
      // Extract just the date part if it's a full ISO string
      if (val && val.includes('T')) {
        return val.split('T')[0];
      }
      return val;
    })
    .refine((val) => {
      if (!val) return false;
      const date = new Date(val);
      return date >= minBirthDate && date <= maxBirthDate;
    }, 'Age must be between 18 and 100 years'),
  sex: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.enum(['M', 'F'], { required_error: 'Sex is required' }),
  ),
});

type ProfileFormType = z.infer<typeof ProfileSchema>;

// Quick Score Submission Form Component
function QuickScoreSubmissionForm({ onScoreAdded }: { onScoreAdded: () => void }) {
  const [activityId, setActivityId] = useState('');
  const [rawValue, setRawValue] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedActivity = EVENT_TYPES.find((a) => a.id === activityId);

  const isTimeInput = () => {
    return selectedActivity?.inputType === 'TIME';
  };

  const handleScoreChange = (value: string) => {
    if (isTimeInput()) {
      // For time input, allow mm:ss.ms format (e.g., "1:26.3") or ss.ms format (e.g., "86.3")
      const timeRegex = /^[0-9]*:?[0-9]*\.?[0-9]*$/;
      if (timeRegex.test(value) || value === '') {
        setRawValue(value);
      }
    } else {
      // For other inputs, only allow numbers
      setRawValue(value.replace(/[^0-9.]/g, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!activityId || !rawValue) {
        setError('Please select a test and enter a value.');
        setIsSubmitting(false);
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
          setIsSubmitting(false);
          return;
        }
      }

      // Parse the score value based on input type
      let parsedRawValue: number;
      if (isTimeInput()) {
        const { parseTimeWithMilliseconds } = await import('@/utils/scoring');
        parsedRawValue = parseTimeWithMilliseconds(rawValue);
      } else {
        parsedRawValue = Number(rawValue);
      }

      await api.post('/api/user/scores', {
        activityId,
        rawValue: parsedRawValue,
        reps: selectedActivity?.supportsReps && reps ? Number(reps) : undefined,
        notes,
      });

      // Reset form
      setActivityId('');
      setRawValue('');
      setReps('');
      setNotes('');

      // Call the callback to refresh scores
      onScoreAdded();

      // Show success message (you could add a toast notification here)
      setError(''); // Clear any previous errors
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to add score');
      } else {
        setError('Failed to add score');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Test</label>
          <select
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {selectedActivity.inputType === 'WEIGHT' && 'Weight (kg)'}
              {selectedActivity.inputType === 'TIME' && 'Time (mm:ss.ms or ss.ms)'}
              {selectedActivity.inputType === 'DISTANCE' && 'Distance (m)'}
            </label>
            <input
              type={isTimeInput() ? 'text' : 'number'}
              step="any"
              value={rawValue}
              onChange={(e) => handleScoreChange(e.target.value)}
              placeholder={isTimeInput() ? 'e.g., 1:26.3 or 86.3' : undefined}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        )}
      </div>

      {selectedActivity?.supportsReps && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Reps (optional)</label>
          <input
            type="number"
            min={selectedActivity.minReps || 1}
            max={selectedActivity.maxReps || 10}
            placeholder={`${selectedActivity.defaultReps || 1} (default)`}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Leave empty for 1RM. Range: {selectedActivity.minReps || 1}-
            {selectedActivity.maxReps || 10}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this score..."
          className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-700/50 rounded p-3">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 flex items-center"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            'Submit Score'
          )}
        </button>
      </div>
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormType>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: '',
      bodyweight: '',
      dateOfBirth: '',
      sex: undefined,
    },
  });

  const [eventScores, setEventScores] = useState<EventWithScores[]>([]); // event objects with .scores
  const [personalScores, setPersonalScores] = useState<Score[]>([]);
  const [allScores, setAllScores] = useState<EnrichedScore[]>([]); // All scores from getUserScores
  const [teams, setTeams] = useState<Team[]>([]);

  // Loading states for different sections
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);

  // State for public profile stat toggles
  const [showAge, setShowAge] = useState<boolean>(false);
  const [showBodyweight, setShowBodyweight] = useState<boolean>(false);
  const [showSex, setShowSex] = useState<boolean>(false);
  const [publicProfileEnabled, setPublicProfileEnabled] = useState<boolean>(false);

  // Profile name management
  const [profileName, setProfileName] = useState<string>('');
  const [isCheckingProfileName, setIsCheckingProfileName] = useState<boolean>(false);
  const [profileNameAvailable, setProfileNameAvailable] = useState<boolean | null>(null);
  const [profileNameError, setProfileNameError] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await api.get('/api/user/profile');
        setProfile(profileData);
      } catch (error: unknown) {
        console.error('Error fetching profile:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
        setError(errorMessage);
      } finally {
        setIsLoadingProfile(false);
        setIsLoading(false);
      }
    };

    const fetchScores = async () => {
      try {
        // Fetch event scores
        const eventScoresData = await api.get('/api/user/events');
        setEventScores(eventScoresData);

        // Fetch personal scores
        const personalScoresData = await api.get('/api/user/scores');
        setPersonalScores(personalScoresData);

        // Fetch all scores for the latest scores section
        const allScoresResponse = await getUserScores();
        if (allScoresResponse.success) {
          setAllScores(allScoresResponse.data || []);
        }
      } catch (error: unknown) {
        console.error('Error fetching scores:', error);
      } finally {
        setIsLoadingScores(false);
      }
    };

    const fetchTeams = async () => {
      try {
        const teamsResponse = await api.get('/api/teams/user');
        setTeams(teamsResponse.teams || []);
      } catch (error: unknown) {
        console.error('Error fetching teams:', error);
      } finally {
        setIsLoadingTeams(false);
      }
    };

    if (user) {
      fetchProfile();
      fetchScores();
      fetchTeams();
    }
  }, [user]);

  // When profile loads, reset form values
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        bodyweight: profile.bodyweight?.toString() || '',
        dateOfBirth: profile.dateOfBirth
          ? convertFirestoreTimestamp(profile.dateOfBirth)?.toISOString().split('T')[0] || ''
          : '',
        sex: profile.sex as 'M' | 'F' | undefined,
      });
      // When profile loads, set stat toggles
      setShowAge(!!profile.publicProfileShowAge);
      setShowBodyweight(!!profile.publicProfileShowBodyweight);
      setShowSex(!!profile.publicProfileShowSex);
      setPublicProfileEnabled(!!profile.publicProfileEnabled);
      setProfileName(profile.profileName || '');
    }
  }, [profile, reset]);

  // Check profile name availability
  const checkProfileNameAvailability = useCallback(async (name: string) => {
    if (!name.trim()) {
      setProfileNameAvailable(null);
      setProfileNameError('');
      return;
    }

    setIsCheckingProfileName(true);
    setProfileNameError('');

    try {
      const response = await api.post('/api/user/profile/check-username', {
        profileName: name.trim(),
      });

      setProfileNameAvailable(response.available);
      if (!response.available) {
        setProfileNameError(response.error || 'Profile name is not available');
      }
    } catch (error: unknown) {
      setProfileNameAvailable(false);
      setProfileNameError(error instanceof Error ? error.message : 'Error checking availability');
    } finally {
      setIsCheckingProfileName(false);
    }
  }, []);

  // Debounced profile name checking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (profileName !== (profile?.profileName || '')) {
        checkProfileNameAvailability(profileName);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [profile?.profileName, checkProfileNameAvailability, profileName]);

  const onSubmit = async (data: ProfileFormType) => {
    setIsLoading(true);
    setError('');
    try {
      // Handle date transformation manually
      let processedDateOfBirth = data.dateOfBirth;
      if (data.dateOfBirth && data.dateOfBirth.includes('T')) {
        processedDateOfBirth = data.dateOfBirth.split('T')[0];
      }

      const updatedProfile = await api.put('/api/user/profile', {
        name: data.name,
        bodyweight: Number(data.bodyweight),
        dateOfBirth: processedDateOfBirth || undefined,
        sex: data.sex,
        publicProfileEnabled,
        publicProfileShowAge: !!showAge,
        publicProfileShowBodyweight: !!showBodyweight,
        publicProfileShowSex: !!showSex,
      });
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const calculateAge = (dateOfBirth: unknown) => {
    const birthDate = convertFirestoreTimestamp(dateOfBirth);
    if (!birthDate) return 'Not set';
    return calculateAgeFromDateOfBirth(birthDate);
  };

  // Helper functions copied from profile/scores page
  const getCanonicalEventId = (score: EnrichedScore): string | undefined => {
    if (score.testId && EVENT_TYPES.some((et) => et.id === score.testId)) return score.testId;
    if (score.activityId && EVENT_TYPES.some((et) => et.id === score.activityId))
      return score.activityId;
    if (score.activityName) {
      // Fuzzy match: if activityName contains canonical event name
      const match = EVENT_TYPES.find((et) =>
        score.activityName?.toLowerCase().includes(et.name.toLowerCase()),
      );
      if (match) return match.id;
    }
    return undefined;
  };

  const getCanonicalEventName = (score: EnrichedScore) => {
    const id = getCanonicalEventId(score);
    const eventType = EVENT_TYPES.find((et) => et.id === id);
    return eventType ? eventType.name : score.activityName || score.activityId;
  };

  const formatRawScoreWithReps = (score: EnrichedScore) => {
    const canonicalId = getCanonicalEventId(score) || '';
    const eventType = EVENT_TYPES.find((et) => et.id === canonicalId);
    // For lifts, always show x reps (default to 1)
    if (eventType && eventType.inputType === 'WEIGHT') {
      const reps = score.reps ?? 1;
      return beautifyRawScore(score.rawScore, canonicalId, reps);
    }
    // For other events, just use beautifyRawScore
    return beautifyRawScore(score.rawScore, canonicalId);
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'Unknown date';
    let date: Date | null = null;
    try {
      if (typeof timestamp === 'object' && timestamp !== null) {
        if (typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
          date = (timestamp as { toDate: () => Date }).toDate();
        } else if (timestamp instanceof Date) {
          date = timestamp;
        } else if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
          // Firestore Timestamp object
          date = new Date(timestamp.seconds * 1000);
        }
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      if (!date || isNaN(date.getTime())) return 'Unknown date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Colors for team card footers (cycling through)
  const teamFooterColors = [
    'bg-red-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-primary-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];

  const getTeamFooterColor = (index: number) => {
    return teamFooterColors[index % teamFooterColors.length];
  };

  const _formatEventDate = (dateString: unknown) => {
    if (!dateString) return 'TBD';

    let date: Date;

    // Handle Firestore Timestamp objects
    if (typeof dateString === 'object' && dateString !== null) {
      // Check if it's a Firestore Timestamp with seconds and nanoseconds
      if (
        'seconds' in dateString &&
        typeof (dateString as { seconds: number }).seconds === 'number'
      ) {
        date = new Date((dateString as { seconds: number }).seconds * 1000);
      } else if (
        'toDate' in dateString &&
        typeof (dateString as { toDate: () => Date }).toDate === 'function'
      ) {
        date = (dateString as { toDate: () => Date }).toDate();
      } else {
        return 'TBD';
      }
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'TBD';
      }
    } else if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'number') {
      date = new Date(dateString);
    } else {
      return 'TBD';
    }

    // Format as "17th Jan 2025"
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();

    // Add ordinal suffix to day
    const getOrdinalSuffix = (day: number) => {
      if (day >= 11 && day <= 13) {
        return 'th';
      }
      switch (day % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    };

    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  };

  // Helper to merge and group scores by activity
  const _getAllScoresByActivity = () => {
    // Flatten event scores into activity scores
    type ScoreWithEvent = Score & { event?: EventWithScores; testId?: string };
    const eventActivityScores: ScoreWithEvent[] = [];
    eventScores.forEach((event) => {
      (event.scores || []).forEach((score: ScoreWithEvent) => {
        eventActivityScores.push({ ...score, event });
      });
    });
    // Combine with personal scores
    const allScores: ScoreWithEvent[] = [...eventActivityScores, ...personalScores];
    // Group by testId (if present) or activityId
    const grouped: Record<string, ScoreWithEvent[]> = {};
    allScores.forEach((score) => {
      const key =
        (typeof (score as ScoreWithEvent).testId === 'string' &&
          (score as ScoreWithEvent).testId) ||
        score.activityId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(score);
    });
    return grouped;
  };

  return (
    <ProtectedRoute>
      <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
          <div className="container mx-auto px-4 py-8">
            {/* Welcome Section */}
            <WelcomeSection
              showMetrics={true}
              verifiedScore={
                computeTotalsFromScores(
                  personalScores as unknown as Parameters<typeof computeTotalsFromScores>[0],
                  eventScores as unknown as Parameters<typeof computeTotalsFromScores>[1],
                ).verifiedTotal
              }
              totalScore={
                computeTotalsFromScores(
                  personalScores as unknown as Parameters<typeof computeTotalsFromScores>[0],
                  eventScores as unknown as Parameters<typeof computeTotalsFromScores>[1],
                ).total
              }
              isLoading={isLoadingScores}
            />

            {/* Main Content Grid - Row-based layout for proper alignment */}
            <div className="space-y-8">
              {/* Row 1: Profile Information & Public Profile */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Information Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white text-2xl font-bold">Profile Information</h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1 rounded-lg transition-colors"
                      disabled={isLoadingProfile}
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  {isLoadingProfile ? (
                    <ProfileInfoSkeleton />
                  ) : (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                      {error && (
                        <div className="mb-6 bg-red-900/20 border border-red-700/50 rounded-md p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg
                                className="h-5 w-5 text-red-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-200">Error</h3>
                              <div className="mt-2 text-sm text-red-300">{error}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {isEditing ? (
                        <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              {...register('name')}
                              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.name && (
                              <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Bodyweight (kg)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              {...register('bodyweight')}
                              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.bodyweight && (
                              <p className="text-xs text-red-400 mt-1">
                                {errors.bodyweight.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              {...register('dateOfBirth')}
                              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.dateOfBirth && (
                              <p className="text-xs text-red-400 mt-1">
                                {errors.dateOfBirth.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Sex
                            </label>
                            <select
                              {...register('sex')}
                              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Select...</option>
                              <option value="M">Male</option>
                              <option value="F">Female</option>
                            </select>
                            {errors.sex && (
                              <p className="text-xs text-red-400 mt-1">{errors.sex.message}</p>
                            )}
                          </div>
                          <div className="flex justify-end space-x-3 pt-4">
                            <button
                              type="button"
                              onClick={() => setIsEditing(false)}
                              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
                            >
                              {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <span className="text-sm text-gray-400">Name:</span>
                            <div className="font-medium text-white">{profile?.name}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-400">Email:</span>
                            <div className="font-medium text-white">{profile?.email}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-400">Bodyweight:</span>
                            <div className="font-medium text-white">
                              {profile?.bodyweight ? `${profile.bodyweight} kg` : 'Not set'}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-400">Age:</span>
                            <div className="font-medium text-white">
                              {profile?.dateOfBirth
                                ? `${calculateAge(profile.dateOfBirth)} years`
                                : 'Not set'}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-400">Sex:</span>
                            <div className="font-medium text-white">
                              {profile?.sex || 'Not set'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Public Profile Section */}
                <div>
                  <h2 className="text-white text-2xl font-bold mb-4">Public Profile</h2>
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-2 text-white">
                          <input
                            type="checkbox"
                            checked={publicProfileEnabled}
                            onChange={(e) => setPublicProfileEnabled(e.target.checked)}
                            className="rounded"
                          />
                          Make my profile public
                        </label>
                      </div>
                      {publicProfileEnabled && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-md font-semibold mb-2 text-white">Profile Name</h4>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                placeholder="Enter a custom profile name"
                                className="flex-1 border border-gray-600 rounded-md px-3 py-2 bg-gray-700 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                              {isCheckingProfileName && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                              )}
                            </div>
                            {profileName && (
                              <div className="mt-1 text-sm">
                                {profileNameAvailable === true && (
                                  <span className="text-green-400">✓ Available</span>
                                )}
                                {profileNameAvailable === false && (
                                  <span className="text-red-400">✗ {profileNameError}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-md font-semibold mb-2 text-white">
                              Show on Public Profile
                            </h4>
                            <div className="flex flex-col gap-2">
                              <label className="flex items-center gap-2 text-white">
                                <input
                                  type="checkbox"
                                  checked={showAge}
                                  onChange={(e) => setShowAge(e.target.checked)}
                                  className="rounded"
                                />
                                Show Age
                              </label>
                              <label className="flex items-center gap-2 text-white">
                                <input
                                  type="checkbox"
                                  checked={showBodyweight}
                                  onChange={(e) => setShowBodyweight(e.target.checked)}
                                  className="rounded"
                                />
                                Show Bodyweight
                              </label>
                              <label className="flex items-center gap-2 text-white">
                                <input
                                  type="checkbox"
                                  checked={showSex}
                                  onChange={(e) => setShowSex(e.target.checked)}
                                  className="rounded"
                                />
                                Show Sex
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        {publicProfileEnabled && (
                          <a
                            href={`/public/profile/${profileName || user?.uid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                          >
                            View Public Profile
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={isLoading}
                          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                          onClick={async () => {
                            setIsLoading(true);
                            setError('');
                            try {
                              const updatedProfile = await api.put('/api/user/profile', {
                                name: profile?.name,
                                bodyweight: profile?.bodyweight,
                                dateOfBirth: profile?.dateOfBirth
                                  ? convertFirestoreTimestamp(profile.dateOfBirth)
                                      ?.toISOString()
                                      .split('T')[0]
                                  : undefined,
                                sex: profile?.sex,
                                publicProfileEnabled,
                                publicProfileShowAge: !!showAge,
                                publicProfileShowBodyweight: !!showBodyweight,
                                publicProfileShowSex: !!showSex,
                                profileName: profileName.trim() || null,
                              });
                              setProfile(updatedProfile);
                            } catch {
                              setError('Failed to update public profile settings');
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                        >
                          {isLoading && !isLoadingProfile ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Verification Status & My Teams */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Verification Status Section */}
                <div>
                  <h2 className="text-white text-2xl font-bold mb-4">Verification Status</h2>
                  {isLoadingProfile ? (
                    <VerificationStatusSkeleton />
                  ) : (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                      <div className="space-y-4">
                        <div>
                          <span className="text-sm text-gray-400">Status:</span>
                          <div className="mt-1">
                            <span
                              className={`px-3 py-1 text-sm font-medium rounded-full ${getVerificationStatusColor(
                                profile?.verificationStatus || 'PENDING',
                              )}`}
                            >
                              {profile?.verificationStatus || 'PENDING'}
                            </span>
                          </div>
                        </div>

                        {profile?.verificationNotes && (
                          <div>
                            <span className="text-sm text-gray-400">Notes:</span>
                            <div className="mt-1 text-sm text-white">
                              {profile.verificationNotes}
                            </div>
                          </div>
                        )}

                        {Boolean(profile?.verifiedAt) && (
                          <div>
                            <span className="text-sm text-gray-400">Verified on:</span>
                            <div className="mt-1 text-sm text-white">
                              {formatDate(profile?.verifiedAt as Date)}
                            </div>
                          </div>
                        )}

                        {profile?.verificationStatus === 'PENDING' && (
                          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-md">
                            <p className="text-sm text-yellow-200">
                              Your profile is pending verification. An admin will review your
                              information soon.
                            </p>
                          </div>
                        )}

                        {profile?.verificationStatus === 'REJECTED' && (
                          <div className="mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-md">
                            <p className="text-sm text-red-200">
                              Your profile was rejected. Please update your information and contact
                              an admin.
                            </p>
                          </div>
                        )}

                        {profile?.verificationStatus === 'VERIFIED' && (
                          <div className="mt-4 p-3 bg-green-900/20 border border-green-700/50 rounded-md">
                            <p className="text-sm text-green-200">
                              ✓ Your profile has been verified. Your scores can be submitted to
                              events!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* My Teams Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white text-2xl font-bold">My Teams</h2>
                    <Link
                      href="/teams"
                      className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1 rounded-lg transition-colors"
                    >
                      More
                    </Link>
                  </div>
                  {isLoadingTeams ? (
                    <div className="flex space-x-4 pb-4 overflow-hidden">
                      <TeamCardSkeleton />
                      <TeamCardSkeleton />
                    </div>
                  ) : (
                    <div className="flex space-x-4 pb-4 overflow-x-auto">
                      {/* User's Teams */}
                      {teams.length > 0 ? (
                        teams.slice(0, 2).map((team, index) => (
                          <Link
                            key={team.id}
                            href={`/teams/${team.id}`}
                            className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 relative overflow-hidden hover:scale-105 transition-transform duration-200"
                          >
                            {/* Team Background/Logo */}
                            <div className="absolute inset-0">
                              {team.logoUrl ? (
                                <Image
                                  src={team.logoUrl}
                                  alt={team.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Image
                                    src="/challenger-logo-no-text.png"
                                    alt="Challenger logo"
                                    width={80}
                                    height={80}
                                    className="opacity-80"
                                  />
                                </div>
                              )}
                              {/* Dark overlay for text readability */}
                              <div className="absolute inset-0 bg-black/30" />
                            </div>

                            {/* Team Title Overlay */}
                            <div className="absolute top-4 left-4 right-4 z-10">
                              <h3 className="text-white font-bold text-lg leading-tight">
                                {team.name}
                              </h3>
                            </div>

                            {/* Team Info Footer */}
                            <div
                              className={`absolute bottom-0 left-0 right-0 ${getTeamFooterColor(index)} p-3`}
                            >
                              <div className="flex items-center space-x-2 text-white text-sm">
                                <FiUsers className="w-4 h-4" />
                                <span>{team.userRole === 'CAPTAIN' ? 'Captain' : 'Member'}</span>
                              </div>
                              <div className="text-white text-sm mt-1 opacity-90">View Team</div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <>
                          <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-gray-400 text-sm mb-2">No teams yet</p>
                              <p className="text-gray-500 text-xs">Create or join one</p>
                            </div>
                          </div>
                          <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-gray-400 text-sm mb-2">Join a team</p>
                              <p className="text-gray-500 text-xs">Get started</p>
                            </div>
                          </div>
                        </>
                      )}
                      <Link
                        href="/teams"
                        className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors"
                      >
                        <FiPlus className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-gray-400 text-sm">Create Team</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Submit New Score & My Latest Scores */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Submit New Score Section */}
                <div>
                  <h2 className="text-white text-2xl font-bold mb-4">Submit New Score</h2>
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                    <QuickScoreSubmissionForm
                      onScoreAdded={() => {
                        // Refresh all score data when a new score is added
                        // Add a small delay to ensure Firestore write has propagated
                        setTimeout(() => {
                          Promise.all([
                            api.get('/api/user/scores').then(setPersonalScores),
                            api.get('/api/user/events').then(setEventScores),
                            getUserScores().then((response) => {
                              if (response.success) {
                                setAllScores(response.data || []);
                              }
                            }),
                          ]).catch(() => {});
                        }, 500);
                      }}
                    />
                  </div>
                </div>

                {/* My Latest Scores Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white text-2xl font-bold">My Latest Scores</h2>
                    <Link
                      href="/profile/scores"
                      className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1 rounded-lg transition-colors"
                    >
                      More
                    </Link>
                  </div>
                  {isLoadingScores ? (
                    <ScoresListSkeleton />
                  ) : allScores.length === 0 ? (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 text-center">
                      <div className="text-gray-400">
                        <p>
                          No scores found. Start participating in events to see your scores here!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                      <div className="space-y-3">
                        {allScores
                          .sort((a, b) => {
                            const dateA = a.timestamp
                              ? new Date(formatDate(a.timestamp)).getTime()
                              : 0;
                            const dateB = b.timestamp
                              ? new Date(formatDate(b.timestamp)).getTime()
                              : 0;
                            return dateB - dateA;
                          })
                          .slice(0, 5)
                          .map((score) => {
                            const isVerified = score.eventId; // Event scores are considered verified
                            return (
                              <div
                                key={score.id}
                                className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="px-2 py-1 text-xs bg-primary-500/20 text-primary-400 rounded font-semibold">
                                        {getCanonicalEventName(score)}
                                      </span>
                                      {/* Verification Status Badge */}
                                      <span
                                        className={`px-2 py-1 text-xs rounded font-medium ${
                                          isVerified
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-gray-500/20 text-gray-400'
                                        }`}
                                      >
                                        {isVerified ? 'Verified' : 'Unverified'}
                                      </span>
                                      {score.eventName && (
                                        <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded">
                                          {score.eventName}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-1 text-xs text-gray-400">
                                      <FiClock className="w-3 h-3" />
                                      <span>{formatDate(score.timestamp)}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-primary-400">
                                      {score.calculatedScore.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-gray-400">Challenger Score</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {formatRawScoreWithReps(score)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
