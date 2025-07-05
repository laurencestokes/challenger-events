'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return null;
}
