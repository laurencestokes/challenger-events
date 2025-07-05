'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/firebase-auth';
import { api } from '../lib/api-client';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: unknown;
}

export default function CompetitorDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsData = await api.get('/api/events/my-events');
        setEvents(eventsData);
      } catch (error: unknown) {
        console.error('Error fetching events:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchEvents();
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
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Competitor Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {user?.name || user?.email}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              You&apos;re participating in {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/events/join"
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Join Event</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter an event code to participate
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/profile"
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">My Profile</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View your performance history
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Active Events */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">My Events</h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">You haven&apos;t joined any events yet.</p>
              <Link
                href="/events/join"
                className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
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
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                      {event.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Code: {event.code}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${event.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : event.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}
                    >
                      {event.status}
                    </span>
                    <Link
                      href={`/events/${event.id}`}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      View Leaderboard
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Performance */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Performance</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No recent activity to display.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Join an event to start tracking your performance!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
