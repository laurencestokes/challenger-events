'use client';
import { useEffect, useState } from 'react';
import { EVENT_TYPES } from '@/constants/eventTypes';
import type { Score } from '@/lib/firestore';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { beautifyRawScore } from '@/utils/scoring';
import { formatFullTimestamp } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMPETITOR';
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: 'M' | 'F';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNotes?: string;
  verifiedAt?: unknown;
  createdAt: unknown;
  publicProfileEnabled?: boolean;
  publicProfileShowAge?: boolean;
  publicProfileShowBodyweight?: boolean;
  publicProfileShowSex?: boolean;
}

interface EventWithScores {
  id: string;
  name: string;
  code: string;
  status: string;
  joinedAt: unknown;
  scores: Score[];
}

interface PublicProfileData {
  user: User;
  scores: Score[];
}

function getReps(score: unknown): number | undefined {
  if (
    typeof score === 'object' &&
    score !== null &&
    'reps' in score &&
    typeof (score as { reps?: unknown }).reps === 'number'
  ) {
    return (score as { reps: number }).reps;
  }
  return undefined;
}

// Type guard to check for workoutName property
function hasWorkoutName(obj: unknown): obj is { workoutName: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'workoutName' in obj &&
    typeof (obj as { workoutName?: unknown }).workoutName === 'string'
  );
}

export default function PublicProfilePage({ params }: { params: { userid: string } }) {
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [eventScores, setEventScores] = useState<EventWithScores[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      setLoading(true);
      setNotFound(false);
      const res = await fetch(`/api/public/profile/${params.userid}`);
      let userData: PublicProfileData | null = null;
      if (res.ok) {
        userData = await res.json();
      }
      if (cancelled) return;
      // If user not found or not public, show not found immediately
      if (!userData?.user || !userData.user.publicProfileEnabled) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setData(userData);
      // Now fetch event scores
      const eventRes = await fetch(`/api/public/user/events/${params.userid}`);
      if (eventRes.ok) {
        setEventScores(await eventRes.json());
      } else {
        setEventScores(null);
      }
      setLoading(false);
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [params.userid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400 animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 text-center transform transition-all duration-300 hover:scale-105">
            <div className="text-6xl mb-4">🏃‍♂️</div>
            <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Profile Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              This public profile does not exist or is not available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !eventScores) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400 animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  const { user, scores } = data;

  // Flatten event scores into activity scores, attaching event info
  type ScoreWithEvent = Score & { event?: EventWithScores; testId?: string };
  const eventActivityScores: ScoreWithEvent[] = [];
  (eventScores || []).forEach((event: EventWithScores) => {
    (event.scores || []).forEach((score: ScoreWithEvent) => {
      eventActivityScores.push({ ...score, event });
    });
  });
  // Combine with personal scores
  const allScores: ScoreWithEvent[] = [...eventActivityScores, ...(scores || [])];

  // Emoji icons for each event type
  const EVENT_ICONS: Record<string, string> = {
    squat: '🏋️‍♂️',
    bench: '🏋️‍♂️',
    deadlift: '🏋️‍♂️',
    rowing_500m: '🚣‍♂️',
    rowing_4min: '🚣‍♂️',
    bike_500m: '🚲',
    ski_500m: '⛷️',
  };

  // For side-by-side layout, split into two columns: strength and endurance
  const strengthTypes = EVENT_TYPES.filter((type) => type.category === 'STRENGTH');
  const enduranceTypes = EVENT_TYPES.filter((type) => type.category === 'ENDURANCE');

  // Calculate best scores for each event type (for totals)
  const bestScoresByType: Record<string, number> = {};
  const bestVerifiedScoresByType: Record<string, number> = {};
  EVENT_TYPES.forEach((type) => {
    const scoresForType = allScores.filter((s) => (s.testId ?? s.activityId) === type.id);
    // All scores: best of verified or unverified
    const verifiedScores = scoresForType.filter((s) => s.event || s.verified);
    const unverifiedScores = scoresForType.filter((s) => !s.event && !s.verified);
    let bestVerified = verifiedScores[0];
    if (verifiedScores.length > 0) {
      bestVerified = verifiedScores.reduce((prev, curr) =>
        curr.calculatedScore > prev.calculatedScore ? curr : prev,
      );
    }
    let bestUnverified = unverifiedScores[0];
    if (unverifiedScores.length > 0) {
      bestUnverified = unverifiedScores.reduce((prev, curr) =>
        curr.calculatedScore > prev.calculatedScore ? curr : prev,
      );
    }
    const best = bestVerified || bestUnverified;
    if (best) {
      bestScoresByType[type.id] = best.calculatedScore;
    }
    // Only verified scores
    if (bestVerified) {
      bestVerifiedScoresByType[type.id] = bestVerified.calculatedScore;
    }
  });
  // Calculate totals
  const strengthTotal = strengthTypes.reduce((sum, t) => sum + (bestScoresByType[t.id] || 0), 0);
  const enduranceTotal = enduranceTypes.reduce((sum, t) => sum + (bestScoresByType[t.id] || 0), 0);
  const overallTotal = strengthTotal + enduranceTotal;

  const strengthVerifiedTotal = strengthTypes.reduce(
    (sum, t) => sum + (bestVerifiedScoresByType[t.id] || 0),
    0,
  );
  const enduranceVerifiedTotal = enduranceTypes.reduce(
    (sum, t) => sum + (bestVerifiedScoresByType[t.id] || 0),
    0,
  );
  const overallVerifiedTotal = strengthVerifiedTotal + enduranceVerifiedTotal;

  // Helper to render a score card (matches private profile logic)
  function renderScoreCard(type: { id: string; description: string; name: string }) {
    const scores = allScores.filter((s) => (s.testId ?? s.activityId) === type.id);
    // Filter event scores for lifts to only use 1RM (reps === 1 or reps undefined)
    let validScores = scores;
    if (['squat', 'bench', 'deadlift'].includes(type.id)) {
      validScores = scores.filter((score) => {
        const reps = getReps(score) ?? (score.event ? getReps(score.event) : undefined);
        if (score.event && reps !== undefined) {
          return true; // Now include all reps for event scores
        }
        // If not from event, always include
        return true;
      });
    }
    // Find the best verified and best unverified scores
    const verifiedScores = validScores.filter((s) => s.event || s.verified);
    const unverifiedScores = validScores.filter((s) => !s.event && !s.verified);
    let bestVerified = verifiedScores[0];
    if (verifiedScores.length > 0) {
      bestVerified = verifiedScores.reduce((prev, curr) =>
        curr.calculatedScore > prev.calculatedScore ? curr : prev,
      );
    }
    let bestUnverified = unverifiedScores[0];
    if (unverifiedScores.length > 0) {
      bestUnverified = unverifiedScores.reduce((prev, curr) =>
        curr.calculatedScore > prev.calculatedScore ? curr : prev,
      );
    }
    // Decide what to show (match private profile logic)
    const showVerified = bestVerified || null;
    let showUnverified = null;
    if (!showVerified && bestUnverified) {
      showUnverified = bestUnverified;
    } else if (
      showVerified &&
      bestUnverified &&
      bestUnverified.calculatedScore > showVerified.calculatedScore
    ) {
      showUnverified = bestUnverified;
    }
    if (!showVerified && !showUnverified) {
      return (
        <div
          key={type.id}
          className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex flex-col mb-3 transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          <div className="font-semibold text-gray-900 dark:text-white flex items-center">
            <span className="mr-2 text-xl">{EVENT_ICONS[type.id] || '🏅'}</span>
            {type.name}
          </div>
          <div className="text-xs text-gray-400 mb-1">No score yet</div>
        </div>
      );
    }
    return (
      <div
        key={type.id}
        className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 flex flex-col mb-3 transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
      >
        <div className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
          <span className="mr-2 text-xl">{EVENT_ICONS[type.id] || '🏅'}</span>
          {type.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">{type.description}</div>
        {/* Show verified score if exists */}
        {showVerified && (
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {showVerified.calculatedScore}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Challenger Score</span>
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-medium">
              Verified
            </span>
          </div>
        )}
        {showVerified && (
          <div className="text-xs text-gray-700 dark:text-gray-300 mb-2">
            Raw: {beautifyRawScore(showVerified.rawValue, type.id, getReps(showVerified))}
          </div>
        )}
        {showVerified && showVerified.submittedAt && (
          <div className="text-xs text-gray-400 mb-2">
            <span className="font-semibold">Submitted:</span>{' '}
            {formatFullTimestamp(showVerified.submittedAt)}
          </div>
        )}
        {showVerified && showVerified.event && (
          <div className="text-xs text-gray-400 mb-2">
            <span className="font-semibold">Event:</span> {showVerified.event?.name || 'Event'}
            {hasWorkoutName(showVerified) ? (
              <>
                <span className="font-semibold">, Workout:</span> {showVerified.workoutName}
              </>
            ) : (
              ''
            )}
          </div>
        )}
        {/* Show unverified score if exists and should be shown */}
        {showUnverified && (
          <div className="flex items-center space-x-2 mb-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {showUnverified.calculatedScore}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Challenger Score</span>
            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 font-medium">
              Unverified
            </span>
          </div>
        )}
        {showUnverified && (
          <div className="text-xs text-gray-700 dark:text-gray-300 mb-2">
            Raw: {beautifyRawScore(showUnverified.rawValue, type.id, getReps(showUnverified))}
          </div>
        )}
        {showUnverified && showUnverified.submittedAt && (
          <div className="text-xs text-gray-400 mb-2">
            <span className="font-semibold">Submitted:</span>{' '}
            {formatFullTimestamp(showUnverified.submittedAt)}
          </div>
        )}
      </div>
    );
  }

  // Age calculation (copied from private profile)
  function calculateAge(dateOfBirth: unknown): string | number {
    if (!dateOfBirth) return 'Not set';
    // Firestore Timestamp type guard
    type FirestoreTimestamp = { seconds: number; nanoseconds: number };
    const dobRaw = dateOfBirth;
    let dob: Date;
    if (typeof dobRaw === 'object' && dobRaw !== null && 'seconds' in dobRaw) {
      dob = new Date((dobRaw as FirestoreTimestamp).seconds * 1000);
    } else if (typeof dobRaw === 'string') {
      dob = new Date(dobRaw);
    } else {
      return 'Not set';
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return isNaN(age) ? 'Not set' : age;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 md:p-12 overflow-hidden relative">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary-200 to-primary-300 dark:from-primary-800 dark:to-primary-700 rounded-full opacity-20 transform -translate-x-12 translate-y-12"></div>

          {/* Header Section */}
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full mb-4 shadow-lg">
              <span className="text-3xl">🏃‍♂️</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent mb-2">
              {user.name} - Public Challenger Profile
            </h1>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white text-center transform transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold mb-1">{overallTotal}</div>
              <div className="text-sm opacity-90">Overall Score</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white text-center transform transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold mb-1">{overallVerifiedTotal}</div>
              <div className="text-sm opacity-90">Verified Score</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Strength</h2>
                <span className="text-3xl">💪</span>
              </div>
              <div className="text-4xl font-bold mb-2">{strengthTotal}</div>
              <div className="text-sm opacity-90">{strengthVerifiedTotal} verified</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Endurance</h2>
                <span className="text-3xl">🏃‍♂️</span>
              </div>
              <div className="text-4xl font-bold mb-2">{enduranceTotal}</div>
              <div className="text-sm opacity-90">{enduranceVerifiedTotal} verified</div>
            </div>
          </div>

          {/* Personal Stats */}
          {(user.publicProfileShowAge ||
            user.publicProfileShowBodyweight ||
            user.publicProfileShowSex) && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Personal Stats
              </h3>
              <div className="flex flex-wrap justify-center gap-6">
                {user.publicProfileShowAge && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {String(
                        typeof user.dateOfBirth === 'string' || typeof user.dateOfBirth === 'object'
                          ? calculateAge(user.dateOfBirth)
                          : 'Not set',
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Age</div>
                  </div>
                )}
                {user.publicProfileShowBodyweight && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {typeof user.bodyweight === 'number' ? `${user.bodyweight} kg` : 'Not set'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Bodyweight</div>
                  </div>
                )}
                {user.publicProfileShowSex && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {typeof user.sex === 'string' ? user.sex : 'Not set'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Sex</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detailed Scores */}
          {allScores.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No scores yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Start tracking your performance to see results here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Strength Column */}
              <div>
                <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-6 flex items-center">
                  <span className="mr-2 text-2xl">💪</span>
                  Strength
                </h2>
                <div className="space-y-3">{strengthTypes.map(renderScoreCard)}</div>
              </div>
              {/* Endurance Column */}
              <div>
                <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-6 flex items-center">
                  <span className="mr-2 text-2xl">🏃‍♂️</span>
                  Endurance
                </h2>
                <div className="space-y-3">{enduranceTypes.map(renderScoreCard)}</div>
              </div>
            </div>
          )}

          {/* Call to Action */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-2">Ready to challenge yourself?</h3>
                <p className="text-primary-100 mb-6 text-lg">
                  Join thousands of athletes tracking their performance
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center px-8 py-4 bg-white text-primary-600 font-bold rounded-xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <span className="mr-2">🚀</span>
                  Join Challenger
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
