'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api-client';
import { convertFirestoreTimestamp, calculateAgeFromDateOfBirth } from '../../lib/utils';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { EVENT_TYPES, EventType } from '@/constants/eventTypes';
import type { Score, Team as BaseTeam } from '@/lib/firestore';

interface Team extends BaseTeam {
  userRole?: 'CAPTAIN' | 'MEMBER' | null;
  isMember?: boolean;
  logoUrl?: string;
}
import Link from 'next/link';
import Image from 'next/image';
import { FiPlus, FiUsers, FiClock } from 'react-icons/fi';
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

  const formatDate = (date: unknown) => {
    const dateObj = convertFirestoreTimestamp(date);
    return dateObj ? dateObj.toLocaleDateString() : 'Not set';
  };

  const calculateAge = (dateOfBirth: unknown) => {
    const birthDate = convertFirestoreTimestamp(dateOfBirth);
    if (!birthDate) return 'Not set';
    return calculateAgeFromDateOfBirth(birthDate);
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

  const formatEventDate = (dateString: unknown) => {
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
  const getAllScoresByActivity = () => {
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
            {/* User Profile Section */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-xl font-bold">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-sm">Welcome Back</p>
                  <h1 className="text-white text-2xl font-bold">{user?.name || user?.email}</h1>
                </div>
              </div>
              <div className="text-right space-y-3">
                <div className="flex flex-col items-end">
                  <p className="text-white font-medium text-base mb-1">Verified Score</p>
                  <div className="bg-green-900/30 border border-green-700/50 px-3 py-2 rounded-lg w-20">
                    <span className="text-green-400 font-bold">773</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-white font-medium text-base mb-1">Total Score</p>
                  <div
                    className="px-3 py-2 rounded-lg w-20"
                    style={{
                      background:
                        'linear-gradient(90deg, #E5965E 0%, #F26004 35.58%, #C10901 67.79%, #240100 100%)',
                    }}
                  >
                    <span className="text-white font-bold">1,981</span>
                  </div>
                </div>
              </div>
            </div>

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

              {/* Row 3: My Latest Scores (spans full width) */}
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
                ) : (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                    <div className="space-y-3">
                      {(() => {
                        // Get all scores and sort by timestamp (most recent first)
                        const allScores = getAllScoresByActivity();
                        const recentScores: Array<{
                          type: EventType;
                          score: Score & { event?: EventWithScores; testId?: string };
                          timestamp: number | Date | string;
                        }> = [];

                        EVENT_TYPES.forEach((type) => {
                          const scores = allScores[type.id] || [];
                          if (scores.length > 0) {
                            // Get the most recent score for this type
                            const mostRecent = scores.reduce((prev, curr) => {
                              const prevTime = prev.submittedAt;
                              const currTime = curr.submittedAt;
                              return currTime > prevTime ? curr : prev;
                            });
                            recentScores.push({
                              type,
                              score: mostRecent,
                              timestamp: mostRecent.submittedAt,
                            });
                          }
                        });

                        // Sort by timestamp and take the 5 most recent
                        recentScores.sort((a, b) => {
                          const timeA = a.timestamp;
                          const timeB = b.timestamp;
                          return timeB > timeA ? 1 : -1;
                        });

                        return recentScores.slice(0, 5).map(({ type, score, timestamp }) => {
                          const isVerified = score.event || score.verified;
                          return (
                            <div
                              key={`${type.id}-${score.id}`}
                              className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="px-2 py-1 text-xs bg-primary-500/20 text-primary-400 rounded font-semibold">
                                      {type.name}
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
                                  </div>
                                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                                    <FiClock className="w-3 h-3" />
                                    <span>{formatEventDate(timestamp)}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-primary-400">
                                    {score.calculatedScore.toFixed(1)}
                                  </div>
                                  <div className="text-xs text-gray-400">Challenger Score</div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      {(() => {
                        const allScores = getAllScoresByActivity();
                        const hasAnyScores = EVENT_TYPES.some(
                          (type) => (allScores[type.id] || []).length > 0,
                        );
                        if (!hasAnyScores) {
                          return (
                            <div className="text-center py-8">
                              <div className="text-gray-400 mb-2">No scores yet</div>
                              <div className="text-gray-500 text-sm">
                                Start participating in events to see your scores here!
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
