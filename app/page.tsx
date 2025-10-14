'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
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
    <div className="relative min-h-screen bg-gray-900">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/sign-in-background.png"
          alt="Background"
          fill
          className="object-cover"
          priority
          quality={75}
          sizes="100vw"
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content - Logo Centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          {/* Logo */}
          <div>
            <Image
              src="/challengerco-logo-text-only.png"
              alt="The Challenger Co."
              width={400}
              height={192}
              className="mx-auto w-64 sm:w-72 md:w-80 lg:w-96 xl:w-[28rem] h-auto"
              priority
            />
            <div className="flex justify-center mt-4">
              <span className="px-3 py-1 text-xs font-bold bg-gradient-athletic text-white rounded-full shadow-challenger font-display">
                BETA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action - Fixed at Bottom */}
      <div className="absolute bottom-12 sm:bottom-16 md:bottom-20 left-0 right-0 z-20 text-center px-6">
        <Link
          href="/auth/signin"
          className="inline-flex items-center px-6 py-3 sm:px-7 sm:py-3.5 md:px-8 md:py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-sans font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-challenger text-base sm:text-lg"
        >
          Sign In / Sign Up
        </Link>
      </div>
    </div>
  );
}
