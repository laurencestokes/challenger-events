'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { isEmailVerified } from '../lib/firebase-auth';

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
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push('/auth/signin');
      } else if (requireAuth && user && firebaseUser && !isEmailVerified(firebaseUser)) {
        // Redirect to verification page if email is not verified
        router.push('/auth/verify-email');
      } else if (requireAdmin && user && user.role !== 'ADMIN') {
        router.push('/dashboard');
      }
    }
  }, [user, firebaseUser, loading, requireAuth, requireAdmin, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return null;
  }

  if (requireAuth && user && firebaseUser && !isEmailVerified(firebaseUser)) {
    return null;
  }

  if (requireAdmin && user && user.role !== 'ADMIN') {
    return null;
  }

  return <>{children}</>;
}
