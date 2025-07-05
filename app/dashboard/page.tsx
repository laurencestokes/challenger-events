'use client';

import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDashboard from '@/components/AdminDashboard';
import CompetitorDashboard from '@/components/CompetitorDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {user?.role === 'ADMIN' ? <AdminDashboard /> : <CompetitorDashboard />}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
