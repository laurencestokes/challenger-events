'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push('/auth/signin');
      } else if (requireAdmin && user && user.role !== 'ADMIN') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, requireAuth, requireAdmin, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return null;
  }

  if (requireAdmin && user && user.role !== 'ADMIN') {
    return null;
  }

  return <>{children}</>;
}
