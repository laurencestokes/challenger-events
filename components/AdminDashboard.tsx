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

export default function AdminDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsData = await api.get('/api/events');
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
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 font-sans">
              Welcome back, {user?.name || user?.email}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/admin/events/create"
          className="card p-6 hover:shadow-challenger-lg transition-shadow"
        >
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
                Create Event
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-sans">
                Start a new competition
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/events"
          className="card p-6 hover:shadow-challenger-lg transition-shadow"
        >
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
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white font-sans">
                Manage Events
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-sans">
                View and edit competitions
              </p>
            </div>
          </div>
        </Link>

        <Link href="/admin/users" className="card p-6 hover:shadow-challenger-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-accent-500 rounded-md flex items-center justify-center shadow-challenger">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white font-sans">
                Manage Users
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-sans">
                Invite and manage users
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/images/upload"
          className="card p-6 hover:shadow-challenger-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-accent-500 rounded-md flex items-center justify-center shadow-challenger">
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
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white font-sans">
                Manage Images
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-sans">
                Upload, view, and delete images for briefs
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Events */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white font-sans">
            Recent Events
          </h3>
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
              <p className="text-gray-500 dark:text-gray-400 font-sans">No events created yet.</p>
              <Link href="/admin/events/create" className="mt-2 btn-primary">
                Create Your First Event
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
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 font-sans"
                    >
                      View
                    </Link>
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
