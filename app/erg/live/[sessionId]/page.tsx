'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { HeadToHeadSession, useErgSocket } from '@/hooks/useErgSocket';
import ErgSpeedometer from '@/components/ErgSpeedometer';

export default function LiveErgDisplayPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<null | undefined | HeadToHeadSession>(null);
  const [loading, setLoading] = useState(true);

  const {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    competitor1Data,
    competitor2Data,
    sessionStatus,
    error,
  } = useErgSocket(sessionId);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/erg/sessions?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Session not found');
      const data = await response.json();
      setSession(data.session);
    } catch (err) {
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [sessionId, fetchSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="text-2xl">Loading competition...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Session Not Found</h2>
          <p className="text-gray-400">This competition session does not exist or has ended.</p>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'ended') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Competition Ended</h2>
          <p className="text-gray-400 mb-8">This session has concluded.</p>
          {(competitor1Data || competitor2Data) && (
            <div className="mt-8">
              <h3 className="text-2xl mb-6 text-yellow-400">Final Scores</h3>
              <div className="flex gap-12 justify-center">
                <div className="bg-blue-500/20 rounded-xl p-6">
                  <p className="text-xl mb-2">{session.competitor1.name}</p>
                  <p className="text-5xl font-bold text-blue-400">
                    {competitor1Data?.calculatedScore.toFixed(1) || '0'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    {competitor1Data?.metrics.distance || 0}m
                  </p>
                </div>
                <div className="bg-purple-500/20 rounded-xl p-6">
                  <p className="text-xl mb-2">{session.competitor2.name}</p>
                  <p className="text-5xl font-bold text-purple-400">
                    {competitor2Data?.calculatedScore.toFixed(1) || '0'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    {competitor2Data?.metrics.distance || 0}m
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-6xl font-bold text-center mb-4 tracking-wider">HEAD TO HEAD</h1>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span
            className={`px-4 py-2 rounded-full font-semibold ${
              isConnected
                ? 'bg-green-500/20 text-green-400'
                : isReconnecting
                  ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                  : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isConnected
              ? '🟢 LIVE'
              : isReconnecting
                ? `🟡 RECONNECTING (${reconnectAttempt})`
                : '🔴 DISCONNECTED'}
          </span>
          {!competitor1Data && !competitor2Data && isConnected && (
            <span className="text-yellow-400 animate-pulse text-lg">
              Waiting for competitors to start...
            </span>
          )}
        </div>
      </div>

      {/* Speedometer Dashboard */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-12 mb-12">
          {/* Competitor 1 Speedometer */}
          <ErgSpeedometer
            name={session.competitor1.name}
            age={session.competitor1.age}
            sex={session.competitor1.sex}
            weight={session.competitor1.weight}
            score={competitor1Data?.calculatedScore || 0}
            pace={competitor1Data?.metrics.pace}
            power={competitor1Data?.metrics.power}
            distance={competitor1Data?.metrics.distance}
            heartRate={competitor1Data?.metrics.heartRate}
            strokeRate={competitor1Data?.metrics.strokeRate}
            calories={competitor1Data?.metrics.calories}
            accentColor="#3b82f6"
            textColor="text-blue-400"
          />

          {/* Competitor 2 Speedometer */}
          <ErgSpeedometer
            name={session.competitor2.name}
            age={session.competitor2.age}
            sex={session.competitor2.sex}
            weight={session.competitor2.weight}
            score={competitor2Data?.calculatedScore || 0}
            pace={competitor2Data?.metrics.pace}
            power={competitor2Data?.metrics.power}
            distance={competitor2Data?.metrics.distance}
            heartRate={competitor2Data?.metrics.heartRate}
            strokeRate={competitor2Data?.metrics.strokeRate}
            calories={competitor2Data?.metrics.calories}
            accentColor="#a855f7"
            textColor="text-purple-400"
          />
        </div>

        {/* Leader Indicator */}
        {competitor1Data && competitor2Data && (
          <div className="text-center">
            <div className="inline-block bg-yellow-500/20 text-yellow-400 px-8 py-4 rounded-full text-3xl font-bold border-2 border-yellow-500/40 shadow-lg">
              {competitor1Data.calculatedScore > competitor2Data.calculatedScore
                ? `${session.competitor1.name.toUpperCase()} LEADS by ${(competitor1Data.calculatedScore - competitor2Data.calculatedScore).toFixed(1)}`
                : competitor2Data.calculatedScore > competitor1Data.calculatedScore
                  ? `${session.competitor2.name.toUpperCase()} LEADS by ${(competitor2Data.calculatedScore - competitor1Data.calculatedScore).toFixed(1)}`
                  : "IT'S A TIE!"}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 text-center">
            <div className="inline-block bg-red-500/20 text-red-400 px-6 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
