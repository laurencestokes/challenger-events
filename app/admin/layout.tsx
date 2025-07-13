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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to access the admin area.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Admin Navigation */}
          <div className="mb-8">
            <nav className="flex space-x-8">
              <Link
                href="/admin"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/events"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium"
              >
                Events
              </Link>
              <Link
                href="/admin/users"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium"
              >
                Users
              </Link>
              <Link
                href="/admin/verification"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium"
              >
                Verification
              </Link>
              <Link
                href="/admin/events"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 text-sm font-medium"
              >
                Competition Weigh-In
              </Link>
            </nav>
          </div>
          {children}
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
