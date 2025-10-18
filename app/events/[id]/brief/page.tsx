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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
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
  brief?: string;
  imageUrl?: string;
  participants?: Participant[];
  isTeamEvent?: boolean;
  teamScoringMethod?: 'SUM' | 'AVERAGE' | 'BEST';
  maxTeamSize?: number;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: string;
  age?: number;
  joinedAt: unknown;
  score?: number;
}

export default function EventBrief() {
  const params = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const eventId = params.id as string;

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventData = await api.get(`/api/events/${eventId}`);
        setEvent(eventData);
      } catch (error: unknown) {
        console.error('Error fetching event details:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch event details';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const formatDate = (dateString: unknown) => {
    if (!dateString) return 'Not set';

    // Handle Firestore Timestamp objects
    if (typeof dateString === 'object' && dateString !== null) {
      // Check if it's a Firestore Timestamp with seconds and nanoseconds
      if (
        'seconds' in dateString &&
        typeof (dateString as { seconds: number }).seconds === 'number'
      ) {
        const date = new Date((dateString as { seconds: number }).seconds * 1000);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }

      // Check if it has toDate method (Firestore SDK Timestamp)
      if (
        'toDate' in dateString &&
        typeof (dateString as { toDate: () => Date }).toDate === 'function'
      ) {
        return (dateString as { toDate: () => Date }).toDate().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }

    // Handle string dates
    if (typeof dateString === 'string') {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    // Handle Date objects
    if (dateString instanceof Date) {
      return dateString.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    // Handle numbers (timestamps)
    if (typeof dateString === 'number') {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    return 'Invalid date';
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

              {/* Content Skeleton */}
              <div className="space-y-8">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-40 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-700 rounded w-4/5"></div>
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
            <div className="mb-6">
              <nav className="flex items-center space-x-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-500">/</span>
                <Link
                  href={`/events/${eventId}`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {event.name}
                </Link>
                <span className="text-gray-500">/</span>
                <span className="text-white font-medium">Brief</span>
              </nav>
            </div>

            {/* Event Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">{event.name} - Event Brief</h1>
              <p className="text-gray-400">Complete information and guidelines for competitors</p>
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
                      <span className="text-lg font-medium">Location TBD</span>
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

            {/* Custom Brief Content or Default Content */}
            {event.brief ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 mb-8">
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {event.brief}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <>
                {/* Event Overview */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-4">Event Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">Event Code</h3>
                      <p className="text-lg font-mono font-medium text-white">{event.code}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">Status</h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-200">
                        {event.status}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">Start Date</h3>
                      <p className="text-white">{formatDate(event.startDate)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">End Date</h3>
                      <p className="text-white">{formatDate(event.endDate)}</p>
                    </div>
                  </div>
                  {event.description && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
                      <p className="text-white leading-relaxed">{event.description}</p>
                    </div>
                  )}
                </div>

                {/* Competition Format */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-4">Competition Format</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">Event Type</h3>
                      <p className="text-gray-300">
                        {event.isTeamEvent ? (
                          <>
                            This is a <strong>team competition</strong>.
                            {event.teamScoringMethod === 'SUM' &&
                              ' Team scores are calculated by summing all member scores.'}
                            {event.teamScoringMethod === 'AVERAGE' &&
                              ' Team scores are calculated by averaging member scores.'}
                            {event.teamScoringMethod === 'BEST' &&
                              ' Team scores are calculated by taking the best individual score.'}
                            {event.maxTeamSize &&
                              ` Maximum team size: ${event.maxTeamSize} members.`}
                          </>
                        ) : (
                          'This is an individual competition. Each competitor competes independently.'
                        )}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">Scoring System</h3>
                      <p className="text-gray-300">
                        Scores are calculated using age, sex, and bodyweight-adjusted formulas. This
                        ensures fair competition across different demographics.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">Real-time Updates</h3>
                      <p className="text-gray-300">
                        Leaderboards update in real-time as scores are submitted. You can view live
                        rankings throughout the competition.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rules and Guidelines */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-4">Rules and Guidelines</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">General Rules</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-300">
                        <li>All lifts must be performed with proper form and technique</li>
                        <li>Competitors must provide accurate bodyweight measurements</li>
                        <li>Age and sex information must be accurate for fair scoring</li>
                        <li>All attempts must be witnessed by an event official</li>
                        <li>Appropriate safety equipment is required</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        Equipment Requirements
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-300">
                        <li>Weightlifting shoes or flat-soled shoes</li>
                        <li>Comfortable, non-restrictive clothing</li>
                        <li>Belt (optional but recommended for heavy lifts)</li>
                        <li>Chalk for grip (if needed)</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">Safety Guidelines</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-300">
                        <li>Warm up properly before attempting maximum lifts</li>
                        <li>Use spotters when appropriate</li>
                        <li>Listen to your body and don't attempt lifts beyond your capability</li>
                        <li>Stay hydrated throughout the competition</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* How to Participate */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-4">How to Participate</h2>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-900 rounded-full flex items-center justify-center">
                        <span className="text-primary-400 font-semibold text-sm">1</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white mb-1">Join the Event</h3>
                        <p className="text-gray-300">
                          Use the event code <strong>{event.code}</strong> to join this competition.
                          You can join from the main event page.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-900 rounded-full flex items-center justify-center">
                        <span className="text-primary-400 font-semibold text-sm">2</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white mb-1">
                          Complete Your Profile
                        </h3>
                        <p className="text-gray-300">
                          Ensure your profile includes accurate age, sex, and bodyweight information
                          for proper scoring calculations.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-900 rounded-full flex items-center justify-center">
                        <span className="text-primary-400 font-semibold text-sm">3</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white mb-1">Perform Your Lifts</h3>
                        <p className="text-gray-300">
                          Complete your lifts during the event period. All lifts must be witnessed
                          and recorded by event officials.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-900 rounded-full flex items-center justify-center">
                        <span className="text-primary-400 font-semibold text-sm">4</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white mb-1">Track Your Progress</h3>
                        <p className="text-gray-300">
                          Monitor your scores and ranking on the live leaderboard. Scores are
                          updated in real-time as they're submitted.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                  <h2 className="text-2xl font-semibold text-white mb-4">Questions or Concerns?</h2>
                  <p className="text-gray-300 mb-4">
                    If you have any questions about the event format, rules, or technical issues,
                    please contact the event organizers.
                  </p>
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                    <p className="text-blue-200 text-sm">
                      <strong>Event Support:</strong> Contact the event administrators through the
                      platform or reach out to the competition organizers directly.
                    </p>
                  </div>
                </div>
              </>
            )}

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
