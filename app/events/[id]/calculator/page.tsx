'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import Image from 'next/image';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScoreCalculator from '@/components/ScoreCalculator';
import { LargeEventCardSkeleton } from '@/components/SkeletonLoaders';

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: unknown;
  description?: string;
  imageUrl?: string;
  participants?: Participant[];
  isTeamEvent?: boolean;
  teamScoringMethod?: 'SUM' | 'AVERAGE' | 'BEST';
  maxTeamSize?: number;
  postcode?: string;
  country?: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  score?: number;
  joinedAt: unknown;
}

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
  userId: string;
  eventId: string;
  bodyweight: number;
  status: string;
  verifiedAt?: string | Date;
  verificationNotes?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: 'M' | 'F';
}

export default function EventCalculator() {
  const params = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [competitionVerification, setCompetitionVerification] =
    useState<CompetitionVerification | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const eventId = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventData, activitiesData] = await Promise.all([
          api.get(`/api/events/${eventId}`),
          api.get(`/api/events/${eventId}/activities`),
        ]);
        setEvent(eventData);
        setActivities(activitiesData);

        // Fetch user profile and competition verification if user is logged in
        if (user) {
          const [profile, verification] = await Promise.all([
            api.get('/api/user/profile'),
            api.get(`/api/events/${eventId}/competition-verification`),
          ]);
          setUserProfile(profile);
          // Find this user's verification
          if (verification && Array.isArray(verification.verifications)) {
            const myVerification = verification.verifications.find(
              (v: CompetitionVerification) => v.userId === user.id && v.status === 'VERIFIED',
            );
            setCompetitionVerification(myVerification || null);
          } else {
            setCompetitionVerification(null);
          }
        }
      } catch (error: unknown) {
        console.error('Error fetching data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchData();
    }
  }, [eventId, user]);

  const formatDate = (dateString: unknown) => {
    if (!dateString) return 'Not set';

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
        return 'Not set';
      }
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Not set';
      }
    } else if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'number') {
      date = new Date(dateString);
    } else {
      return 'Not set';
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header />
          <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
            <div className="container mx-auto px-4 py-8">
              {/* Welcome Section Skeleton */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-full animate-pulse mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-6 bg-gray-700 rounded w-32 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-right space-y-3">
                  <div className="flex flex-col items-end">
                    <div className="h-4 bg-gray-700 rounded w-20 mb-1 animate-pulse"></div>
                    <div className="bg-gray-700 rounded-lg w-20 h-10 animate-pulse"></div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="h-4 bg-gray-700 rounded w-16 mb-1 animate-pulse"></div>
                    <div className="bg-gray-700 rounded-lg w-20 h-10 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Breadcrumbs Skeleton */}
              <div className="mb-6">
                <div className="h-4 bg-gray-700 rounded w-48 animate-pulse"></div>
              </div>

              {/* Event Header Skeleton */}
              <div className="mb-8">
                <div className="h-8 bg-gray-700 rounded w-80 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-700 rounded w-64 animate-pulse"></div>
              </div>

              {/* Event Card Skeleton */}
              <div className="mb-8">
                <LargeEventCardSkeleton />
              </div>

              {/* Calculator Skeleton */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-40 mb-4"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header />
          <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
            <div className="container mx-auto px-4 py-8">
              <div className="text-center py-8">
                <p className="text-red-400">{error}</p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  if (!event) {
    return (
      <ProtectedRoute>
        <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header />
          <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
            <div className="container mx-auto px-4 py-8">
              <div className="text-center py-8">
                <p className="text-gray-400">Event not found.</p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  // Determine which bodyweight to use for calculations
  const bodyweightForScoring = competitionVerification?.bodyweight || userProfile?.bodyweight || 70;
  const sexForScoring = userProfile?.sex || 'M';

  return (
    <ProtectedRoute>
      <div className="bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="flex-1" style={{ backgroundColor: '#0F0F0F' }}>
          <div className="container mx-auto px-4 py-8">
            {/* Welcome Section */}
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

            {/* Breadcrumbs */}
            <nav
              className="mb-6 text-sm text-gray-400 flex items-center space-x-2"
              aria-label="Breadcrumb"
            >
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <Link href={`/events/${eventId}`} className="hover:text-white transition-colors">
                {event.name}
              </Link>
              <span>/</span>
              <span className="text-white font-semibold">Score Calculator</span>
            </nav>

            {/* Event Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Score Calculator</h1>
              <p className="text-gray-400">Calculate your target scores for {event.name}</p>
            </div>

            {/* Event Card */}
            <div className="mb-8">
              <div className="w-full h-80 bg-gray-800 rounded-2xl relative overflow-hidden">
                {/* Event Background Image */}
                <div className="absolute inset-0">
                  {event.imageUrl ? (
                    <Image src={event.imageUrl} alt={event.name} fill className="object-cover" />
                  ) : (
                    <Image
                      src="/event_placeholder.png"
                      alt={event.name}
                      fill
                      className="object-cover"
                    />
                  )}
                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-black/40" />
                </div>

                {/* Event Title Overlay */}
                <div className="absolute top-6 left-6 right-6 z-10">
                  <h2 className="text-white font-bold text-3xl leading-tight mb-2">{event.name}</h2>
                  {event.description && (
                    <p className="text-white/90 text-lg leading-relaxed max-w-2xl">
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Event Details Footer */}
                <div className="absolute bottom-0 left-0 right-0 bg-red-500 p-6">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3 text-white">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-lg font-medium">{formatDate(event.startDate)}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-lg font-medium">
                        {event.postcode ? (
                          <>
                            {event.postcode}
                            {event.country && (
                              <span className="ml-1">
                                {event.country === 'GB' ? '🇬🇧' : event.country}
                              </span>
                            )}
                          </>
                        ) : (
                          'Location TBD'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-white mt-3">
                      <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                        {event.status}
                      </span>
                      <span className="text-sm text-white/80">
                        Code: <span className="font-mono font-medium">{event.code}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Calculator Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">Score Calculator</h2>
                <p className="text-gray-400">
                  Calculate your target scores for each workout in this event. Your personal stats
                  are automatically configured.
                </p>
              </div>
              <ScoreCalculator
                activities={activities}
                userProfileOverride={{
                  bodyweight: bodyweightForScoring,
                  dateOfBirth: userProfile?.dateOfBirth,
                  sex: sexForScoring,
                  competitionVerification,
                  profileBodyweight: userProfile?.bodyweight,
                }}
              />
            </div>

            {/* Navigation */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href={`/events/${eventId}`}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Back to Event
              </Link>
              <Link
                href={`/events/${eventId}/leaderboard`}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-600 text-base font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
