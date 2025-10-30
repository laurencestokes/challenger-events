'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  if (authLoading) {
    return (
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 border-primary-500"></div>
            <p className="text-white text-lg">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    router.push('/');
    return null;
  }

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400 text-lg">
              Manage your events, users, and live competitions
            </p>
          </div>

          {/* Admin Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Admin Score Tool */}
            <Link
              href="/admin/score-tool"
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:bg-gray-700/50 transition-colors group"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-pink-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2a4 4 0 014-4h6m-6 0l2-2m-2 2l2 2M7 7h.01M7 11h.01M7 15h.01M4 6h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white group-hover:text-pink-400 transition-colors">
                  Score Tool
                </h3>
              </div>
              <p className="text-gray-400 mb-4">
                Quickly compute scores for any event without saving data
              </p>
              <div className="text-pink-400 text-sm font-medium">Open Score Tool →</div>
            </Link>
            {/* Events Management */}
            <Link
              href="/admin/events"
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:bg-gray-700/50 transition-colors group"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                  Events
                </h3>
              </div>
              <p className="text-gray-400 mb-4">
                Create and manage competitions, view leaderboards, and handle event logistics
              </p>
              <div className="text-blue-400 text-sm font-medium">Manage Events →</div>
            </Link>

            {/* User Management */}
            <Link
              href="/admin/users"
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:bg-gray-700/50 transition-colors group"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-green-400"
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
                <h3 className="text-xl font-semibold text-white group-hover:text-green-400 transition-colors">
                  Users
                </h3>
              </div>
              <p className="text-gray-400 mb-4">
                View and manage user accounts, roles, and permissions
              </p>
              <div className="text-green-400 text-sm font-medium">Manage Users →</div>
            </Link>

            {/* Head-to-Head Erg Sessions */}
            <Link
              href="/admin/erg/head-to-head"
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:bg-gray-700/50 transition-colors group"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors">
                  Head-to-Head Erg
                </h3>
              </div>
              <p className="text-gray-400 mb-4">
                Set up live head-to-head erg competitions between two competitors
              </p>
              <div className="text-purple-400 text-sm font-medium">Create Session →</div>
            </Link>

            {/* Team Erg Sessions */}
            <Link
              href="/admin/erg/team-session"
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:bg-gray-700/50 transition-colors group"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-1.306-.835-2.418-2-2.83M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-1.306.835-2.418 2-2.83m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white group-hover:text-orange-400 transition-colors">
                  Team Erg Sessions
                </h3>
              </div>
              <p className="text-gray-400 mb-4">
                Create team-based erg competitions where multiple participants contribute to team
                scores
              </p>
              <div className="text-orange-400 text-sm font-medium">Create Team Session →</div>
            </Link>

            {/* Image Upload */}
            <Link
              href="/admin/images/upload"
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:bg-gray-700/50 transition-colors group"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-cyan-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  Image Upload
                </h3>
              </div>
              <p className="text-gray-400 mb-4">
                Upload and manage images for events and competitions
              </p>
              <div className="text-cyan-400 text-sm font-medium">Upload Images →</div>
            </Link>

            {/* Verification */}
            <Link
              href="/admin/verification"
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:bg-gray-700/50 transition-colors group"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white group-hover:text-yellow-400 transition-colors">
                  Verification
                </h3>
              </div>
              <p className="text-gray-400 mb-4">Verify user submissions and competition results</p>
              <div className="text-yellow-400 text-sm font-medium">Review Submissions →</div>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">🟢</div>
                <p className="text-gray-400">System Online</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">📊</div>
                <p className="text-gray-400">Live Monitoring</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400 mb-2">⚡</div>
                <p className="text-gray-400">Real-time Updates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
