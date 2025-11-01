'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { HeadToHeadSession, useErgSocket, Competitor } from '@/hooks/useErgSocket';
import { getEventTypeById } from '@/constants/eventTypes';
import ErgSpeedometer from '@/components/ErgSpeedometer';
import Image from 'next/image';
import { animate, createScope, Scope } from 'animejs';

export default function LiveErgDisplayPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<null | undefined | HeadToHeadSession>(null);
  const [loading, setLoading] = useState(true);
  const [animationInitialized, setAnimationInitialized] = useState(false);
  const [_competitorsUpdating, setCompetitorsUpdating] = useState(false);

  // Refs for animations
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<Scope | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const _speedometer1Ref = useRef<HTMLDivElement>(null);
  const _speedometer2Ref = useRef<HTMLDivElement>(null);

  const { isConnected, isReconnecting, reconnectAttempt, competitorData, sessionStatus, error } =
    useErgSocket(sessionId);

  const fetchSession = useCallback(async () => {
    try {
      console.log('Fetching session for ID:', sessionId);
      const response = await fetch(`/api/erg/sessions?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Session not found');
      const data = await response.json();
      console.log('Session data received:', data);
      console.log('Updated competitors:', {
        competitors:
          data.session?.competitors?.map((c: Competitor) => c.name) ||
          (data.session?.competitor1 && data.session?.competitor2
            ? [data.session.competitor1.name, data.session.competitor2.name]
            : []),
      });
      setSession(data.session);
    } catch (err) {
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Handle competitor updates - refetch session when competitors are updated
  useEffect(() => {
    const handleCompetitorsUpdated = async (data: {
      sessionId: string;
      competitor1: Competitor;
      competitor2: Competitor;
    }) => {
      console.log('Competitors updated, refetching session...', data);
      setCompetitorsUpdating(true);
      // Refetch session to get updated competitor data
      await fetchSession();
      // Clear the updating state after a short delay
      setTimeout(() => setCompetitorsUpdating(false), 2000);
    };

    const handleSessionEnded = (_data: unknown) => {
      // The useErgSocket hook should handle this via its own listener
    };

    // Listen for competitor updates and session ended via socket
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSocket } = require('@/lib/socket-client');
    const socket = getSocket();

    // Join the session room to receive events
    if (sessionId) {
      socket.emit('session:join', sessionId);
    }

    socket.on('session:competitors-updated', handleCompetitorsUpdated);
    socket.on('session:ended', handleSessionEnded);

    // Add connection event listeners
    socket.on('connect', () => {
      if (sessionId) {
        socket.emit('session:join', sessionId);
      }
    });

    return () => {
      socket.off('session:competitors-updated', handleCompetitorsUpdated);
      socket.off('session:ended', handleSessionEnded);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [fetchSession]);

  // Initialize animations when session data is loaded
  useEffect(() => {
    console.log('Animation effect triggered:', {
      session: !!session,
      animationInitialized,
      rootRef: !!rootRef.current,
    });

    if (session && !animationInitialized && rootRef.current) {
      console.log('Initializing animations...');

      // Create anime.js scope
      scopeRef.current = createScope({ root: rootRef.current }).add((self) => {
        console.log('Anime.js scope created');

        // Header animation
        animate('.header-card', {
          opacity: [0, 1],
          translateY: [-50, 0],
          duration: 1000,
          ease: 'out(4)',
        });

        // Speedometer animations with staggered delays
        animate('.speedometer-1', {
          opacity: [0, 1],
          scale: [0.8, 1],
          duration: 1200,
          delay: 300,
          ease: 'out(4)',
        });

        animate('.speedometer-2', {
          opacity: [0, 1],
          scale: [0.8, 1],
          duration: 1200,
          delay: 500,
          ease: 'out(4)',
        });

        // Register method for score updates
        self?.add('animateScoreUpdate', (selector: string) => {
          animate(selector, {
            scale: [1, 1.1, 1],
            duration: 300,
            ease: 'inOut(2)',
          });
        });
      });

      setAnimationInitialized(true);
    }

    // Cleanup on unmount
    return () => {
      if (scopeRef.current) {
        scopeRef.current.revert();
      }
    };
  }, [session, animationInitialized]);

  // Animate score updates
  useEffect(() => {
    if (competitorData.length > 0) {
      // Animate score changes using the registered method
      if (scopeRef.current?.methods?.animateScoreUpdate) {
        const scoreElements = document.querySelectorAll('.score-value');
        scoreElements.forEach((element) => {
          scopeRef.current?.methods.animateScoreUpdate(`#${element.id || 'score'}`);
        });
      }
    }
  }, [competitorData]);

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
          {competitorData.length > 0 && (
            <div className="mt-8">
              <h3 className="text-2xl mb-6 text-yellow-400">Final Scores</h3>
              <div
                className={`flex gap-12 justify-center ${competitorData.length === 1 ? 'flex-col items-center' : competitorData.length === 2 ? 'flex-row' : 'flex-wrap'}`}
              >
                {(
                  session.competitors ||
                  (session.competitor1 && session.competitor2
                    ? [session.competitor1, session.competitor2]
                    : [])
                ).map((competitor, index) => {
                  const data = competitorData[index];
                  const colors = [
                    'text-blue-400',
                    'text-purple-400',
                    'text-green-400',
                    'text-yellow-400',
                    'text-red-400',
                    'text-pink-400',
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div key={competitor.id} className="bg-orange-500/20 rounded-xl p-6">
                      <p
                        className={`text-xl mb-2 ${color}`}
                        style={{ fontFamily: 'var(--font-ropa-sans)' }}
                      >
                        {competitor.name.toUpperCase()}
                      </p>
                      <p
                        className={`text-5xl font-bold ${color} font-display`}
                        style={{ fontFamily: 'var(--font-orbitron)' }}
                      >
                        {data?.calculatedScore ? Math.round(data.calculatedScore) : '0'}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        {(() => {
                          const eventType = session.eventType
                            ? getEventTypeById(session.eventType)
                            : undefined;
                          const label = eventType?.inputType === 'TIME' ? 'remaining' : 'm';
                          const value = data?.metrics.distance_m || 0;
                          return eventType?.inputType === 'TIME'
                            ? `${value}m ${label}`
                            : `${value}${label}`;
                        })()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col"
      style={{ backgroundColor: '#0F0F0F' }}
    >
      {/* Header with Challenger Branding and Live Indicator */}
      <div className="container mx-auto px-4 pt-8 pb-4">
        <div ref={headerRef} className="header-card">
          <div className="flex justify-between items-center">
            {/* Spacer for balance - only on desktop */}
            <div className="hidden md:block flex-1"></div>
            {/* Challenger Branding - Left on mobile, centered on desktop */}
            <div className="flex flex-col items-start md:items-center">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/challengerco-logo-text-only.png"
                  alt="The Challenger Co."
                  width={240}
                  height={96}
                  className="h-12 md:h-16 lg:h-20 w-auto"
                  priority
                />
              </a>
            </div>
            {/* Live Indicator */}
            <div className="flex-1 flex justify-end">
              <div className="flex flex-col items-end space-y-2">
                <span className="px-4 py-2 text-sm md:text-base font-bold bg-gradient-athletic text-white rounded-full shadow-challenger font-display">
                  LIVE
                </span>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    isConnected
                      ? 'bg-green-500/20 text-green-400'
                      : isReconnecting
                        ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                        : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {isConnected
                    ? '🟢 CONNECTED'
                    : isReconnecting
                      ? `🟡 RECONNECTING (${reconnectAttempt})`
                      : '🔴 DISCONNECTED'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Speedometer Dashboard */}
      <div className="container mx-auto px-4 mt-8 mb-8">
        <div
          className="backdrop-blur-sm rounded-2xl shadow-lg mb-6 border-2 border-orange-500/20"
          style={{ backgroundColor: '#0F0F0F' }}
        >
          <div className="p-4 sm:p-8">
            <div
              className={`grid gap-4 sm:gap-6 md:gap-8 ${
                (session.competitors?.length ||
                  (session.competitor1 && session.competitor2 ? 2 : 0)) === 1
                  ? 'grid-cols-1'
                  : (session.competitors?.length ||
                        (session.competitor1 && session.competitor2 ? 2 : 0)) === 2
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
              }`}
            >
              {(
                session.competitors ||
                (session.competitor1 && session.competitor2
                  ? [session.competitor1, session.competitor2]
                  : [])
              ).map((competitor, index) => {
                const data = competitorData[index];
                const colors = [
                  { accent: '#3b82f6', text: 'text-blue-400' },
                  { accent: '#a855f7', text: 'text-purple-400' },
                  { accent: '#10b981', text: 'text-green-400' },
                  { accent: '#f59e0b', text: 'text-yellow-400' },
                  { accent: '#ef4444', text: 'text-red-400' },
                  { accent: '#ec4899', text: 'text-pink-400' },
                ];
                const color = colors[index % colors.length];

                const eventType = session.eventType
                  ? getEventTypeById(session.eventType)
                  : undefined;
                const distanceLabel = eventType?.inputType === 'TIME' ? 'REMAINING' : 'DISTANCE';
                return (
                  <div key={competitor.id} className={`speedometer-${index + 1}`}>
                    <ErgSpeedometer
                      key={`comp${index + 1}-${competitor.id}-${data?.calculatedScore || 0}`}
                      name={competitor.name}
                      age={competitor.age}
                      sex={competitor.sex}
                      weight={competitor.weight}
                      score={data?.calculatedScore || 0}
                      pace={data?.metrics.average_pace_s}
                      power={data?.metrics.average_power_W}
                      distance={data?.metrics.distance_m}
                      duration={data?.metrics.duration_s}
                      heartRate={data?.metrics.heartRate}
                      strokeRate={data?.metrics.strokeRate}
                      calories={data?.metrics.calories}
                      accentColor={color.accent}
                      textColor={color.text}
                      distanceLabel={distanceLabel}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

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
