'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import TeamManagement from '@/components/TeamManagement';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TeamsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex flex-col">
        <Header />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Team Management
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Create teams, join existing ones, and manage your team memberships
                </p>
              </div>

              <TeamManagement />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
