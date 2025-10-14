'use client';

import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="text-center py-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Access Denied
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                You don't have permission to access the admin area.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* Admin Navigation */}
            <div className="mb-8">
              <nav className="flex space-x-8 overflow-x-auto">
                <Link
                  href="/admin"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/events"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Events
                </Link>
                <Link
                  href="/admin/users"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Users
                </Link>
                <Link
                  href="/admin/verification"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Verification
                </Link>
                <Link
                  href="/admin/erg/head-to-head"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  🚣 Erg Live
                </Link>
                <Link
                  href="/admin/events"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Competition Weigh-In
                </Link>
              </nav>
            </div>
            {children}
          </div>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
