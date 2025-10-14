'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
            <p>{error || 'Session not found'}</p>
            <Button onClick={() => router.push('/admin/erg/head-to-head')} className="mt-4">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Head-to-Head Control Panel</h1>
        <p className="text-gray-600 dark:text-gray-400">Session ID: {sessionId}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Status Card */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Connection Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Socket.IO</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    isConnected
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : isReconnecting
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
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
                <span>Session Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm capitalize ${
                    sessionStatus === 'active'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}
                >
                  {sessionStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Python Client</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    competitor1Data || competitor2Data
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}
                >
                  {competitor1Data || competitor2Data ? 'Streaming' : 'Waiting'}
                </span>
              </div>
            </div>
            {(socketError || error) && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">
                {socketError || error}
              </div>
            )}
          </div>
        </Card>

        {/* Competitors Card */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Competitors</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  Competitor 1
                </h4>
                <p className="text-xl font-bold mb-1">{session.competitor1.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {session.competitor1.age} years, {session.competitor1.sex}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {session.competitor1.weight}kg
                </p>
                {competitor1Data && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      Score: {competitor1Data.calculatedScore.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {competitor1Data.metrics.distance}m @ {competitor1Data.metrics.pace}s/500m
                    </p>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-purple-600 dark:text-purple-400 mb-2">
                  Competitor 2
                </h4>
                <p className="text-xl font-bold mb-1">{session.competitor2.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {session.competitor2.age} years, {session.competitor2.sex}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {session.competitor2.weight}kg
                </p>
                {competitor2Data && (
                  <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      Score: {competitor2Data.calculatedScore.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {competitor2Data.metrics.distance}m @ {competitor2Data.metrics.pace}s/500m
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Public Display URL */}
      <Card className="mb-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Public Display</h3>
          <div className="flex items-center gap-4 mb-4">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800"
            />
            <Button onClick={copyPublicUrl}>Copy URL</Button>
          </div>
          <div className="flex items-start gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Share this URL or QR code with spectators:
              </p>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Open Public Display →
              </a>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={publicUrl} size={120} />
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        {/* Mock Data Controls for Development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="flex gap-2 items-center">
            {!isMockRunning ? (
              <Button onClick={startMockData} variant="secondary">
                🧪 Start Demo Mode
              </Button>
            ) : (
              <Button onClick={stopMockData} variant="secondary">
                ⏸️ Stop Demo Mode
              </Button>
            )}
            {isMockRunning && (
              <span className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">
                Demo data streaming...
              </span>
            )}
          </div>
        )}

        <Button variant="destructive" onClick={handleStopSession}>
          Stop Session
        </Button>
        <Button variant="secondary" onClick={() => window.open(publicUrl, '_blank')}>
          View Public Display
        </Button>
      </div>
    </div>
  );
}
