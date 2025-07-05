'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmailVerification, isEmailVerified } from '../../../lib/firebase-auth';
import { useAuth } from '../../../contexts/AuthContext';

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { firebaseUser } = useAuth();

  const handleResendVerification = async () => {
    if (!firebaseUser) {
      setError('No user found. Please sign in again.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await sendEmailVerification(firebaseUser);
      setMessage('Verification email sent! Please check your inbox.');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send verification email';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!firebaseUser) {
      setError('No user found. Please sign in again.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Reload the user to get the latest verification status
      await firebaseUser.reload();

      if (isEmailVerified(firebaseUser)) {
        setMessage('Email verified! Redirecting to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(
          'Email not yet verified. Please check your inbox and click the verification link.',
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to check verification status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">No User Found</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Please sign in again to verify your email.
            </p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Verify Your Email
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            We&apos;ve sent a verification email to <strong>{firebaseUser.email}</strong>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="mb-4">
                To complete your registration, please check your email and click the verification
                link.
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Check your inbox (and spam folder)</li>
                <li>Click the verification link in the email</li>
                <li>Return here and click &quot;I&apos;ve Verified My Email&quot;</li>
              </ul>
            </div>

            {message && (
              <div className="text-green-600 dark:text-green-400 text-sm text-center bg-green-50 dark:bg-green-900 p-3 rounded">
                {message}
              </div>
            )}

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900 p-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleCheckVerification}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'I&apos;ve Verified My Email'}
              </button>

              <button
                onClick={handleResendVerification}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
