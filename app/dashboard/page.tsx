'use client';

import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDashboard from '@/components/AdminDashboard';
import CompetitorDashboard from '@/components/CompetitorDashboard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
        <Header />
        <div className="flex-1">
          {user?.role === 'ADMIN' ? <AdminDashboard /> : <CompetitorDashboard />}
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
