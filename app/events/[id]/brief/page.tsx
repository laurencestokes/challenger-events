'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

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
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading event brief...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8">
              <p className="text-error-600 dark:text-error-400">{error}</p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!event) {
    return (
      <ProtectedRoute>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Event not found.</p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
              >
                Dashboard
              </Link>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <Link
                href={`/events/${eventId}`}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
              >
                {event.name}
              </Link>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <span className="text-gray-900 dark:text-white text-sm font-medium">Brief</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {event.name} - Event Brief
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Complete information and guidelines for competitors
            </p>
          </div>

          {/* Custom Brief Content or Default Content */}
          {event.brief ? (
            <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6 mb-8">
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {event.brief}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <>
              {/* Event Overview */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Event Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Event Code
                    </h3>
                    <p className="text-lg font-mono font-medium text-gray-900 dark:text-white">
                      {event.code}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Status
                    </h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {event.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Start Date
                    </h3>
                    <p className="text-gray-900 dark:text-white">{formatDate(event.startDate)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      End Date
                    </h3>
                    <p className="text-gray-900 dark:text-white">{formatDate(event.endDate)}</p>
                  </div>
                </div>
                {event.description && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Description
                    </h3>
                    <p className="text-gray-900 dark:text-white leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Competition Format */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Competition Format
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Event Type
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {event.isTeamEvent ? (
                        <>
                          This is a <strong>team competition</strong>.
                          {event.teamScoringMethod === 'SUM' &&
                            ' Team scores are calculated by summing all member scores.'}
                          {event.teamScoringMethod === 'AVERAGE' &&
                            ' Team scores are calculated by averaging member scores.'}
                          {event.teamScoringMethod === 'BEST' &&
                            ' Team scores are calculated by taking the best individual score.'}
                          {event.maxTeamSize && ` Maximum team size: ${event.maxTeamSize} members.`}
                        </>
                      ) : (
                        'This is an individual competition. Each competitor competes independently.'
                      )}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Scoring System
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      Scores are calculated using age, sex, and bodyweight-adjusted formulas. This
                      ensures fair competition across different demographics.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Real-time Updates
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      Leaderboards update in real-time as scores are submitted. You can view live
                      rankings throughout the competition.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rules and Guidelines */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Rules and Guidelines
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      General Rules
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                      <li>All lifts must be performed with proper form and technique</li>
                      <li>Competitors must provide accurate bodyweight measurements</li>
                      <li>Age and sex information must be accurate for fair scoring</li>
                      <li>All attempts must be witnessed by an event official</li>
                      <li>Appropriate safety equipment is required</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Equipment Requirements
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                      <li>Weightlifting shoes or flat-soled shoes</li>
                      <li>Comfortable, non-restrictive clothing</li>
                      <li>Belt (optional but recommended for heavy lifts)</li>
                      <li>Chalk for grip (if needed)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Safety Guidelines
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                      <li>Warm up properly before attempting maximum lifts</li>
                      <li>Use spotters when appropriate</li>
                      <li>Listen to your body and don't attempt lifts beyond your capability</li>
                      <li>Stay hydrated throughout the competition</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* How to Participate */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  How to Participate
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        1
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        Join the Event
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Use the event code <strong>{event.code}</strong> to join this competition.
                        You can join from the main event page.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        2
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        Complete Your Profile
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Ensure your profile includes accurate age, sex, and bodyweight information
                        for proper scoring calculations.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        3
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        Perform Your Lifts
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Complete your lifts during the event period. All lifts must be witnessed and
                        recorded by event officials.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        4
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        Track Your Progress
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Monitor your scores and ranking on the live leaderboard. Scores are updated
                        in real-time as they're submitted.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Questions or Concerns?
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  If you have any questions about the event format, rules, or technical issues,
                  please contact the event organizers.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
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
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
