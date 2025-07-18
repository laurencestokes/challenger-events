'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/firebase-auth';
import { api } from '../lib/api-client';
import Link from 'next/link';
import PerformanceGraph from './PerformanceGraph';

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: unknown;
}

interface Score {
  id: string;
  activityId: string;
  testId?: string; // Add testId field for event scores
  rawValue: number;
  calculatedScore: number;
  reps?: number;
  notes?: string;
  verified: boolean;
  submittedAt: unknown;
  eventId?: string | null;
  workoutName?: string;
  event?: {
    name: string;
  };
}

interface EventWithScores {
  id: string;
  name: string;
  code: string;
  status: string;
  joinedAt: unknown;
  scores: Score[];
}

export default function CompetitorDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [recentScores, setRecentScores] = useState<Score[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch events
        const eventsData = await api.get('/api/events');
        setEvents(eventsData);

        // Fetch recent scores
        const [personalScores, eventScores] = await Promise.all([
          api.get('/api/user/scores').catch(() => []),
          api.get('/api/user/events').catch(() => []),
        ]);

        // Combine and process scores
        const allScores: Score[] = [];

        // Add personal scores
        if (Array.isArray(personalScores)) {
          allScores.push(...personalScores);
        }

        // Add event scores
        if (Array.isArray(eventScores)) {
          eventScores.forEach((event: EventWithScores) => {
            if (event.scores) {
              event.scores.forEach((score) => {
                allScores.push({
                  ...score,
                  event: { name: event.name },
                });
              });
            }
          });
        }

        // Sort by submission date (most recent first) and take the last 50 for the graph
        const sortedScores = allScores
          .sort((a, b) => {
            const dateA = new Date(a.submittedAt as string).getTime();
            const dateB = new Date(b.submittedAt as string).getTime();
            return dateB - dateA;
          })
          .slice(0, 50);

        setRecentScores(sortedScores);
      } catch (error: unknown) {
        console.error('Error fetching data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        setIsLoadingScores(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans">
              Competitor Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 font-sans">
              Welcome back, {user?.name || user?.email}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-sans">
              You&apos;re participating in {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-sans"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/events/join" className="card p-6 hover:shadow-challenger-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center shadow-challenger">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white font-sans">
                Join Event
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-sans">
                Enter an event code to participate
              </p>
            </div>
          </div>
        </Link>

        <Link href="/profile" className="card p-6 hover:shadow-challenger-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center shadow-challenger">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white font-sans">
                My Profile
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-sans">
                View your performance history
              </p>
            </div>
          </div>
        </Link>

        <Link href="/teams" className="card p-6 hover:shadow-challenger-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center shadow-challenger">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white font-sans">
                My Teams
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-sans">
                Manage your teams and join new ones
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Performance */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white font-sans">
              Recent Performance
            </h3>
            <Link
              href="/profile/scores"
              className="text-sm text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 font-sans"
            >
              View All Scores
            </Link>
          </div>
        </div>
        <div className="p-6">
          {isLoadingScores ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : recentScores.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 font-sans">
                No recent scores yet. Start tracking your performance!
              </p>
              <Link href="/profile" className="mt-2 btn-primary">
                Add Your First Score
              </Link>
            </div>
          ) : (
            <PerformanceGraph scores={recentScores} isLoading={isLoadingScores} />
          )}
        </div>
      </div>

      {/* Active Events */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white font-sans">My Events</h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-accent-600 dark:text-accent-400 font-sans">{error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 font-sans">
                You haven&apos;t joined any events yet.
              </p>
              <Link href="/events/join" className="mt-2 btn-primary">
                Join Your First Event
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white font-sans">
                      {event.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-sans">
                      Code: {event.code}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full font-sans ${
                        event.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : event.status === 'COMPLETED'
                            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}
                    >
                      {event.status}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/events/${event.id}`}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 font-sans"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/events/${event.id}/leaderboard`}
                        className="text-accent-600 hover:text-accent-900 dark:text-accent-400 dark:hover:text-accent-300 font-sans"
                      >
                        Leaderboard
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
