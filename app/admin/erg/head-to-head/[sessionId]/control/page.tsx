'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import Button from '@/components/ui/Button';
import { useErgSocket, HeadToHeadSession } from '@/hooks/useErgSocket';
import { useMockErgData } from '@/hooks/useMockErgData';
import { QRCodeSVG } from 'qrcode.react';

export default function SessionControlPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<HeadToHeadSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    startSession,
    stopSession,
    competitor1Data,
    competitor2Data,
    sessionStatus,
    error: socketError,
  } = useErgSocket(sessionId);

  const {
    isRunning: isMockRunning,
    startMockData,
    stopMockData,
  } = useMockErgData(
    session
      ? { sessionId, competitor1: session.competitor1, competitor2: session.competitor2 }
      : null,
  );

  const sessionStartedRef = useRef(false);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/erg/sessions?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Session not found');
      const data = await response.json();
      setSession(data.session);

      // Start the session (notify Python client) only once
      if (data.session && !sessionStartedRef.current) {
        sessionStartedRef.current = true;
        startSession(data.session);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId, startSession]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchSession();
  }, [sessionId, fetchSession]);

  const handleStopSession = () => {
    if (confirm('Are you sure you want to stop this session?')) {
      stopSession();
      setTimeout(() => {
        router.push('/admin/erg/head-to-head');
      }, 1000);
    }
  };

  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/erg/live/${sessionId}` : '';

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    alert('Public URL copied to clipboard!');
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div
                className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4"
                style={{ borderColor: '#4682B4' }}
              ></div>
              <p className="text-white text-lg">Loading session...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !session) {
    return (
      <ProtectedRoute>
        <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Error</h1>
              <p className="text-gray-400 text-lg mb-6 max-w-md mx-auto">
                {error || 'Session not found'}
              </p>
              <Button
                onClick={() => router.push('/admin/erg/head-to-head')}
                className="px-6 py-3 text-white font-semibold rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: '#4682B4' }}
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Link
                    href="/dashboard"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Dashboard
                  </Link>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <Link
                    href="/admin/erg/head-to-head"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                  >
                    Erg Live
                  </Link>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <span className="text-gray-900 dark:text-white text-sm font-medium">
                    Control Panel
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white">Head-to-Head Control Panel</h1>
                <p className="mt-2 text-gray-400">Session ID: {sessionId}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Status Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Connection Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Socket.IO</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${isConnected
                      ? 'bg-green-900/30 text-green-400'
                      : isReconnecting
                        ? 'bg-yellow-900/30 text-yellow-400 animate-pulse'
                        : 'bg-red-900/30 text-red-400'
                      }`}
                  >
                    {isConnected
                      ? 'Connected'
                      : isReconnecting
                        ? `Reconnecting... (${reconnectAttempt})`
                        : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Session Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm capitalize ${sessionStatus === 'active'
                      ? 'bg-blue-900/30 text-blue-400'
                      : 'bg-gray-900/30 text-gray-400'
                      }`}
                  >
                    {sessionStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Python Client</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${competitor1Data || competitor2Data
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                      }`}
                  >
                    {competitor1Data || competitor2Data ? 'Streaming' : 'Waiting'}
                  </span>
                </div>
              </div>
              {(socketError || error) && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 text-red-400 rounded text-sm">
                  {socketError || error}
                </div>
              )}
            </div>

            {/* Competitors Card */}
            <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Competitors</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">Competitor 1</h4>
                  <p className="text-xl font-bold text-white mb-1">{session.competitor1.name}</p>
                  <p className="text-sm text-gray-400">
                    {session.competitor1.age} years, {session.competitor1.sex}
                  </p>
                  <p className="text-sm text-gray-400">{session.competitor1.weight}kg</p>
                  {competitor1Data && (
                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded">
                      <p className="text-2xl font-bold text-blue-400">
                        Score: {competitor1Data.calculatedScore.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {competitor1Data.metrics.distance}m @ {competitor1Data.metrics.pace}s/500m
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400 mb-2">Competitor 2</h4>
                  <p className="text-xl font-bold text-white mb-1">{session.competitor2.name}</p>
                  <p className="text-sm text-gray-400">
                    {session.competitor2.age} years, {session.competitor2.sex}
                  </p>
                  <p className="text-sm text-gray-400">{session.competitor2.weight}kg</p>
                  {competitor2Data && (
                    <div className="mt-4 p-3 bg-purple-900/20 border border-purple-700/50 rounded">
                      <p className="text-2xl font-bold text-purple-400">
                        Score: {competitor2Data.calculatedScore.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {competitor2Data.metrics.distance}m @ {competitor2Data.metrics.pace}s/500m
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Public Display URL */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Public Display</h3>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="text"
                value={publicUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <Button
                onClick={copyPublicUrl}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Copy URL
              </Button>
            </div>
            <div className="flex items-start gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Share this URL or QR code with spectators:
                </p>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Open Public Display →
                </a>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={publicUrl} size={120} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {/* Mock Data Controls for Development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="flex gap-2 items-center">
                {!isMockRunning ? (
                  <Button
                    onClick={startMockData}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    🧪 Start Demo Mode
                  </Button>
                ) : (
                  <Button
                    onClick={stopMockData}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    ⏸️ Stop Demo Mode
                  </Button>
                )}
                {isMockRunning && (
                  <span className="text-sm text-blue-400 animate-pulse">
                    Demo data streaming...
                  </span>
                )}
              </div>
            )}

            <Button
              onClick={handleStopSession}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Stop Session
            </Button>
            <Button
              onClick={() => window.open(publicUrl, '_blank')}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              View Public Display
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
