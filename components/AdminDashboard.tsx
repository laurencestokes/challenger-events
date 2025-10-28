'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api-client';
import Link from 'next/link';
import WelcomeSection from './WelcomeSection';
import { EventListSkeleton } from './SkeletonLoaders';

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <WelcomeSection
          showMetrics={true}
          totalEvents={events.length}
          activeEvents={events.filter((e) => e.status === 'ACTIVE').length}
          isLoading={isLoading}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/admin/events/create"
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: '#E84C04' }}
                >
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3 className="text-lg font-medium text-white">Create Event</h3>
                <p className="text-sm" style={{ color: '#D9D9D9' }}>
                  Start a new competition
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/events"
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: '#4682B4' }}
                >
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3 className="text-lg font-medium text-white">Manage Events</h3>
                <p className="text-sm" style={{ color: '#D9D9D9' }}>
                  View and edit competitions
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: '#E84C04' }}
                >
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3 className="text-lg font-medium text-white">Manage Users</h3>
                <p className="text-sm" style={{ color: '#D9D9D9' }}>
                  Invite and manage users
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/images/upload"
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: '#4682B4' }}
                >
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3 className="text-lg font-medium text-white">Manage Images</h3>
                <p className="text-sm" style={{ color: '#D9D9D9' }}>
                  Upload, view, and delete images for briefs
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/teams"
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: '#E84C04' }}
                >
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3 className="text-lg font-medium text-white">Manage Teams</h3>
                <p className="text-sm" style={{ color: '#D9D9D9' }}>
                  Create and manage teams
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Events */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h3 className="text-xl font-bold text-white">Recent Events</h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <EventListSkeleton />
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-400">{error}</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
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
                <p className="text-gray-400 text-lg mb-4">No events created yet</p>
                <Link
                  href="/admin/events/create"
                  className="inline-flex items-center px-6 py-3 text-white font-medium rounded-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#4682B4' }}
                >
                  <svg
                    className="w-5 h-5 mr-2"
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
                  Create Your First Event
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-6 bg-gray-900/50 border border-gray-700/50 rounded-xl hover:bg-gray-900/70 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-white mb-1">{event.name}</h4>
                      <p className="text-sm" style={{ color: '#D9D9D9' }}>
                        Code: {event.code}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          event.status === 'ACTIVE'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : event.status === 'COMPLETED'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}
                      >
                        {event.status}
                      </span>
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                        style={{ backgroundColor: '#4682B4' }}
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
