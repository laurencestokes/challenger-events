'use client';
import { useEffect, useState } from 'react';
import { EVENT_TYPES } from '@/constants/eventTypes';
import type { Score } from '@/lib/firestore';

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

// Helper to get display units for each test
function getDisplayUnit(typeId: string) {
  switch (typeId) {
    case 'squat':
    case 'bench':
    case 'deadlift':
      return 'kg';
    case 'rowing_500m':
    case 'bike_500m':
    case 'ski_500m':
      return 'seconds';
    case 'rowing_4min':
      return 'm';
    default:
      return '';
  }
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded shadow text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Profile Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300">
            This public profile does not exist or is not available.
          </p>
        </div>
      </div>
    );
  }
  if (!data || !eventScores) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const { user, scores } = data;

  console.log('data', data);

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
          className="border rounded p-4 bg-gray-50 dark:bg-gray-700 flex flex-col mb-2"
        >
          <div className="font-semibold text-gray-900 dark:text-white">{type.name}</div>
          <div className="text-xs text-gray-400 mb-1">No score yet</div>
        </div>
      );
    }
    return (
      <div
        key={type.id}
        className="border rounded p-4 bg-gray-50 dark:bg-gray-700 flex flex-col mb-2"
      >
        <div className="font-semibold text-gray-900 dark:text-white mb-1">
          <span className="mr-2 text-lg align-middle">{EVENT_ICONS[type.id] || '🏅'}</span>
          {type.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{type.description}</div>
        {/* Show verified score if exists */}
        {showVerified && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
              {showVerified.calculatedScore}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Challenger Score</span>
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Verified
            </span>
          </div>
        )}
        {showVerified && (
          <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
            Raw:{' '}
            {getReps(showVerified) && getReps(showVerified)! > 1
              ? `${showVerified.rawValue}kg x ${getReps(showVerified)}`
              : `${showVerified.rawValue} ${getDisplayUnit(type.id)}`}
          </div>
        )}
        {showVerified && showVerified.event && (
          <div className="text-xs text-gray-400">
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
          <div className="flex items-center space-x-2 mb-1 mt-4">
            <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
              {showUnverified.calculatedScore}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Challenger Score</span>
            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Unverified
            </span>
          </div>
        )}
        {showUnverified && (
          <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
            Raw:{' '}
            {getReps(showUnverified) && getReps(showUnverified)! > 1
              ? `${showUnverified.rawValue}kg x ${getReps(showUnverified)}`
              : `${showUnverified.rawValue} ${getDisplayUnit(type.id)}`}
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        {/* Overall/Category Scores */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {user.name}'s Public Profile
          </h1>
          <div className="flex flex-col items-center mb-4">
            <div className="flex flex-col items-center mb-2">
              <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                {overallTotal}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Overall Score</span>
            </div>
            <div className="flex flex-col items-center mb-2">
              <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                {overallVerifiedTotal}
              </span>
              <span className="text-xs text-green-700 dark:text-green-300">
                Overall Score (Verified Only)
              </span>
            </div>
            <div className="flex flex-row justify-center items-center gap-8 mt-2">
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-primary-700 dark:text-primary-300">
                  {strengthTotal}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Strength</span>
                <span className="text-xs text-green-700 dark:text-green-300">
                  {strengthVerifiedTotal} (Verified)
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-primary-700 dark:text-primary-300">
                  {enduranceTotal}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Endurance</span>
                <span className="text-xs text-green-700 dark:text-green-300">
                  {enduranceVerifiedTotal} (Verified)
                </span>
              </div>
            </div>
          </div>
          {/* Only show stats if user has allowed them to be shared */}
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {user.publicProfileShowAge && (
              <span className="text-gray-500 dark:text-gray-400">
                Age:{' '}
                {String(
                  typeof user.dateOfBirth === 'string' || typeof user.dateOfBirth === 'object'
                    ? calculateAge(user.dateOfBirth)
                    : 'Not set',
                )}
              </span>
            )}
            {user.publicProfileShowBodyweight && (
              <span className="text-gray-500 dark:text-gray-400">
                Bodyweight:{' '}
                {typeof user.bodyweight === 'number' ? `${user.bodyweight} kg` : 'Not set'}
              </span>
            )}
            {user.publicProfileShowSex && (
              <span className="text-gray-500 dark:text-gray-400">
                Sex: {typeof user.sex === 'string' ? user.sex : 'Not set'}
              </span>
            )}
          </div>
        </div>
        {allScores.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">No scores yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Strength Column */}
            <div>
              <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-3">
                Strength
              </h2>
              <div className="space-y-2">{strengthTypes.map(renderScoreCard)}</div>
            </div>
            {/* Endurance Column */}
            <div>
              <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-3">
                Endurance
              </h2>
              <div className="space-y-2">{enduranceTypes.map(renderScoreCard)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
