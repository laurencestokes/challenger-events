'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    try {
      if (user) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Navigation error:', err);
      setError('Navigation failed');
    }
  }, [user, loading, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-accent-600 dark:text-accent-400 mb-4 font-display">
            Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-sans">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md font-display font-bold hover:bg-primary-600 transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 font-display">Loading...</h1>
          <p className="text-gray-600 dark:text-gray-400 font-sans">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center">
      <div className="text-center">
        {/* Brand */}
        <div className="mb-8">
          <h1 className="text-6xl font-black font-display text-gray-900 dark:text-white mb-4">
            CHALLENGER
          </h1>
          <div className="flex justify-center">
            <span className="px-3 py-1 text-xs font-bold bg-gradient-athletic text-white rounded-full shadow-challenger font-display">
              BETA
            </span>
          </div>
        </div>

        {/* Call to Action */}
        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="inline-flex items-center px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white font-sans font-bold rounded-md transition-colors shadow-challenger hover:shadow-challenger-lg"
          >
            Sign In / Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
