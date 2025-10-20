'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../../contexts/AuthContext';
import {
  signInWithEmail,
  signUpWithEmail,
  isEmailVerified,
  resetPassword,
} from '../../../lib/firebase-auth';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Show loading while checking authentication
  if (user) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#0F0F0F' }}>
        <div className="max-w-md w-full space-y-8 mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-2 text-white text-lg font-sans">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        await resetPassword(email);
        setSuccess('Password reset email sent! Check your inbox for instructions.');
        setIsForgotPassword(false);
      } else if (isSignUp) {
        await signUpWithEmail(email, password, name);
        // Redirect to verification page after sign up
        router.push('/auth/verify-email');
      } else {
        const userCredential = await signInWithEmail(email, password);

        // Check if email is verified
        if (!isEmailVerified(userCredential)) {
          setError(
            'Please verify your email address before signing in. Check your inbox for a verification link.',
          );
          return;
        }

        router.push('/dashboard');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    setIsSignUp(false);
    setError('');
    setSuccess('');
  };

  const handleBackToSignIn = () => {
    setIsForgotPassword(false);
    setError('');
    setSuccess('');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-900">
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

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 flex justify-end">
        <div className="w-full max-w-md">
          {/* Logo - Above Form */}
          <div className="text-center mb-12">
            <Image
              src="/challengerco-logo-text-only.png"
              alt="The Challenger Co."
              width={400}
              height={192}
              className="mx-auto w-64 sm:w-64 md:w-80 lg:w-80 xl:w-96 h-auto"
              priority
            />
            <div className="flex justify-center mt-4">
              <span className="px-3 py-1 text-xs font-bold bg-gradient-athletic text-white rounded-full shadow-challenger font-display">
                BETA
              </span>
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isForgotPassword
                  ? 'Reset your password'
                  : isSignUp
                    ? 'Create your account'
                    : 'Sign in to your account'}
              </h2>
              {isForgotPassword && (
                <p className="text-sm text-gray-300">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              )}
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {!isForgotPassword && isSignUp && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required={isSignUp}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email-address"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="email-address"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {!isForgotPassword && (
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required={!isForgotPassword}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-400 text-sm text-center bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                  {success}
                </div>
              )}

              {/* Primary Action Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Loading...
                    </div>
                  ) : isForgotPassword ? (
                    'Send reset email'
                  ) : isSignUp ? (
                    'Sign up'
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="text-center space-y-3">
                {isForgotPassword ? (
                  <button
                    type="button"
                    onClick={handleBackToSignIn}
                    className="text-orange-400 hover:text-orange-300 transition-colors font-medium"
                  >
                    Back to sign in
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-orange-400 hover:text-orange-300 transition-colors font-medium"
                    >
                      {isSignUp
                        ? 'Already have an account? Sign in'
                        : "Don't have an account? Sign up"}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
