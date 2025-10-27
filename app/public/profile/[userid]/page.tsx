'use client';
import { useEffect, useState } from 'react';
import { CANONICAL_EVENTS } from '@/constants/achievements';
import type { Score } from '@/lib/firestore';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import SocialMediaImageGenerator from '@/components/SocialMediaImageGenerator';
import { beautifyRawScore } from '@/utils/scoring';
import { formatFullTimestamp, generateQRCode } from '@/lib/utils';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import {
  calculateUserAchievements,
  getHighestScoreAchievement,
  getSpecialistAchievements,
  calculateVerifiedOverallScore,
  calculateOverallScore,
  calculateCategoryAverage,
  type Score as AchievementScore,
} from '@/utils/achievementCalculation';
import { getCanonicalEventsByCategory } from '@/constants/achievements';

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

export default function PublicProfilePage({ params }: { params: { userid: string } }) {
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [eventScores, setEventScores] = useState<EventWithScores[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [performanceProfileOpen, setPerformanceProfileOpen] = useState(false);
  const [detailedScoresOpen, setDetailedScoresOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isImageGeneratorModalOpen, setIsImageGeneratorModalOpen] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Rank mapping based on verified score
  const RANK_TIERS = [
    {
      name: 'Recruit',
      min: 0,
      max: 149,
      image: '/rank-images/challenger-recruit.png',
      color: '#CD7F32',
    },
    {
      name: 'Warrior',
      min: 150,
      max: 299,
      image: '/rank-images/challenger-warrior.png',
      color: '#C0C0C0',
    },
    {
      name: 'Gladiator',
      min: 300,
      max: 449,
      image: '/rank-images/challenger-gladiator.png',
      color: '#FFD700',
    },
    {
      name: 'Spartan',
      min: 450,
      max: 549,
      image: '/rank-images/challenger-spartan.png',
      color: '#E5E4E2',
    },
    {
      name: 'Champion',
      min: 550,
      max: 649,
      image: '/rank-images/challenger-champion.png',
      color: '#B9F2FF',
    },
    {
      name: 'Legend',
      min: 650,
      max: 749,
      image: '/rank-images/challenger-legend.png',
      color: '#8A2BE2',
    },
    {
      name: 'Titan',
      min: 750,
      max: 849,
      image: '/rank-images/challenger-titan.png',
      color: '#FF6B35',
    },
    {
      name: 'Apex',
      min: 850,
      max: Infinity,
      image: '/rank-images/challenger-apex.png',
      color: '#FF0000',
    },
  ];

  // Simple tooltip component
  const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div className="relative inline-block">
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="cursor-help"
        >
          {children}
        </div>
        {isHovered && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-black/95 backdrop-blur-sm text-white text-xs rounded-lg z-50 w-80 border border-gray-600/30 shadow-xl">
            <div className="relative leading-relaxed">{text}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"></div>
          </div>
        )}
      </div>
    );
  };

  // Calculate category average including all scores (verified + unverified)
  const calculateCategoryAverageAll = (
    scores: AchievementScore[],
    category: 'STRENGTH' | 'ENDURANCE',
  ): number => {
    const categoryEvents = getCanonicalEventsByCategory(category);
    const categoryScores = scores.filter((score) =>
      categoryEvents.some((event) => event.id === score.eventTypeId),
    );

    // Get the highest score for each category event (including 0s for missing events)
    const bestScoresByEvent: Record<string, number> = {};

    // Initialize all category events with 0
    categoryEvents.forEach((event) => {
      bestScoresByEvent[event.id] = 0;
    });

    // Update with actual scores
    categoryScores.forEach((score) => {
      const currentBest = bestScoresByEvent[score.eventTypeId] || 0;
      if (score.score > currentBest) {
        bestScoresByEvent[score.eventTypeId] = score.score;
      }
    });

    // Calculate average including 0s for missing events
    const totalScore = Object.values(bestScoresByEvent).reduce((sum, score) => sum + score, 0);
    return Math.round(totalScore / categoryEvents.length);
  };

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

  const handleShareClick = async () => {
    const profileUrl = `${window.location.origin}/public/profile/${params.userid}`;
    try {
      const qrCode = await generateQRCode(profileUrl);
      setQrCodeDataURL(qrCode);
      setIsShareModalOpen(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setIsShareModalOpen(true);
    }
  };

  const handleCopyLink = async () => {
    const profileUrl = `${window.location.origin}/public/profile/${params.userid}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0F0F0F' }}
      >
        <div className="text-center">
          <LoadingSpinner />
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0F0F0F' }}
      >
        <div className="text-center">
          <LoadingSpinner />
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

  // Convert scores to achievement format
  const achievementScores: AchievementScore[] = allScores.map((score) => ({
    eventTypeId: score.testId ?? score.activityId ?? '',
    score: score.calculatedScore,
    verified: score.verified || !!score.event,
    event: score.event,
  }));

  // Calculate scores using canonical events only
  const overallTotal = calculateOverallScore(achievementScores);
  const overallVerifiedTotal = calculateVerifiedOverallScore(achievementScores);

  // Calculate category averages for both total and verified-only
  const strengthTotalAll = calculateCategoryAverageAll(achievementScores, 'STRENGTH');
  const strengthTotalVerified = calculateCategoryAverage(achievementScores, 'STRENGTH');
  const enduranceTotalAll = calculateCategoryAverageAll(achievementScores, 'ENDURANCE');
  const enduranceTotalVerified = calculateCategoryAverage(achievementScores, 'ENDURANCE');

  // Calculate achievements
  const userAchievements = calculateUserAchievements(achievementScores);
  const highestScoreAchievement = getHighestScoreAchievement(userAchievements);
  const specialistAchievements = getSpecialistAchievements(userAchievements);
  const competitorAchievement = userAchievements.find(
    (a) => a.achievement.id === 'competitor' && a.earned,
  );

  // Determine user's rank based on verified score
  const userRank =
    RANK_TIERS.find(
      (rank) => overallVerifiedTotal >= rank.min && overallVerifiedTotal < rank.max,
    ) || RANK_TIERS[0]; // Fallback to Bronze if no match

  // For radar charts - use canonical events only
  const bestScoresByType: Record<string, number> = {};
  const bestVerifiedScoresByType: Record<string, number> = {};

  CANONICAL_EVENTS.forEach((type) => {
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

  // For side-by-side layout, split into two columns: strength and endurance (canonical only)
  const strengthTypes = CANONICAL_EVENTS.filter((type) => type.category === 'STRENGTH');
  const enduranceTypes = CANONICAL_EVENTS.filter((type) => type.category === 'ENDURANCE');

  // Helper to render a score card
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

    const displayScore = showVerified || showUnverified;
    const isVerified = !!showVerified;

    if (!displayScore) {
      return (
        <div
          key={type.id}
          className="bg-[#131313]/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30 flex flex-col"
        >
          <div className="flex items-center mb-3">
            <span className="mr-3 text-2xl">{EVENT_ICONS[type.id] || '🏅'}</span>
            <span
              className="text-white font-semibold"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {type.name}
            </span>
          </div>
          <div className="text-center py-4">
            <div
              className="text-3xl font-bold text-gray-500 mb-2"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              --
            </div>
            <div className="text-sm text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              No score yet
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={type.id}
        className="bg-[#131313]/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30 flex flex-col"
      >
        <div className="flex items-center mb-3">
          <span className="mr-3 text-2xl">{EVENT_ICONS[type.id] || '🏅'}</span>
          <span
            className="text-white font-semibold"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {type.name}
          </span>
        </div>

        <div className="text-center mb-3">
          <div
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'Montserrat, sans-serif', color: '#e84c04' }}
          >
            {displayScore.calculatedScore}
          </div>
          <div
            className="text-sm text-gray-300 mb-2"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {beautifyRawScore(displayScore.rawValue, type.id, getReps(displayScore))}
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${isVerified ? 'text-white' : 'bg-yellow-900 text-yellow-200'}`}
            style={{
              fontFamily: 'Montserrat, sans-serif',
              backgroundColor: isVerified ? '#4682B4' : undefined,
            }}
          >
            {isVerified ? 'Verified' : 'Unverified'}
          </div>
        </div>

        {/* Date/Event information */}
        <div
          className="text-xs text-gray-400 space-y-1"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          {displayScore.submittedAt && (
            <div>
              <span className="font-semibold">Date:</span>{' '}
              {formatFullTimestamp(displayScore.submittedAt, { dateOnly: true })}
            </div>
          )}
          <div>
            <span className="font-semibold">Event:</span> {displayScore.event?.name || '-'}
          </div>
        </div>
      </div>
    );
  }

  // Age calculation
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

  // Radar chart component using Recharts
  function CustomRadarChart({
    scores,
    title,
    color,
  }: {
    scores: Record<string, number>;
    title: string;
    color: string;
  }) {
    // Prepare data for Recharts using canonical events only
    const data = CANONICAL_EVENTS.map((eventType) => ({
      subject: eventType.name.toUpperCase(),
      A: scores[eventType.id] || 0,
      fullMark: 1000,
    }));

    return (
      <div className="text-center">
        <h3 className="text-white text-lg font-bold mb-4">{title}</h3>
        <div className="w-80 h-80 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{
                  fill: 'white',
                  fontSize: 14,
                  textAnchor: 'middle',
                }}
                style={{
                  textAnchor: 'middle',
                }}
                tickFormatter={(value) => value}
                axisLine={false}
                tickLine={false}
                radius={120}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 1000]}
                tick={{
                  fill: 'white',
                  fontSize: 9,
                }}
                tickCount={6}
              />
              <Radar
                name="Score"
                dataKey="A"
                stroke={color}
                fill={color}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img
          src="/event_placeholder.png"
          alt="Background"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto pt-8 pb-6 px-4">
        {/* Hero Section - No Card */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Left Side - Athlete Info */}
          <div className="flex-1 text-center">
            <div className="mb-6">
              <div className="mb-6">
                <h1
                  className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {user.name.split(' ').map((part, index) => (
                    <div key={index}>{part.toUpperCase()}</div>
                  ))}
                </h1>
                <div
                  className="text-6xl md:text-7xl font-bold mb-4 flex items-baseline justify-center gap-3"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <span style={{ color: '#e84c04' }}>{overallTotal}</span>
                  <span className="text-2xl md:text-3xl font-semibold" style={{ color: '#4682B4' }}>
                    {overallVerifiedTotal}
                  </span>
                </div>
                <div
                  className="flex items-center justify-center gap-4 text-white mb-6 font-semibold"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {user.publicProfileShowAge && (
                    <span className="uppercase">
                      Age:{' '}
                      {String(
                        typeof user.dateOfBirth === 'string' || typeof user.dateOfBirth === 'object'
                          ? calculateAge(user.dateOfBirth)
                          : 'Not set',
                      )}
                    </span>
                  )}
                  {user.publicProfileShowBodyweight && (
                    <>
                      <div className="w-px h-6" style={{ backgroundColor: '#e84c04' }}></div>
                      <span className="uppercase">
                        Weight:{' '}
                        {typeof user.bodyweight === 'number' ? `${user.bodyweight} kg` : 'Not set'}
                      </span>
                    </>
                  )}
                  {user.publicProfileShowSex && (
                    <>
                      <div className="w-px h-6" style={{ backgroundColor: '#e84c04' }}></div>
                      <span className="uppercase">
                        Sex: {typeof user.sex === 'string' ? user.sex : 'Not set'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleShareClick}
                  className="bg-[#131313]/50 backdrop-blur-sm border border-gray-600/30 text-white px-6 py-3 rounded-lg font-medium hover:bg-[#131313]/70 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  SHARE
                </button>
                <button
                  onClick={() => setIsImageGeneratorModalOpen(true)}
                  className="bg-[#131313]/50 backdrop-blur-sm border border-gray-600/30 text-white px-6 py-3 rounded-lg font-medium hover:bg-[#131313]/70 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  EXPORT
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Challenger Status */}
          <div className="lg:w-80">
            <div className="text-center">
              <div className="mb-6">
                <img
                  src="/challengerco-logo-text-only.png"
                  alt="Challenger Co"
                  className="h-12 mx-auto object-contain"
                />
                <div className="flex justify-center mt-2">
                  <span
                    className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    BETA
                  </span>
                </div>
              </div>

              {/* Rank Badge */}
              <div className="w-32 h-32 mx-auto mb-4 relative group">
                <img
                  src={userRank.image}
                  alt={`${userRank.name} Rank`}
                  className="w-full h-full object-contain cursor-help"
                />
                {/* Rank Tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 px-4 py-3 bg-black/95 backdrop-blur-sm text-white text-xs rounded-lg z-50 w-80 border border-gray-600/30 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="text-center mb-3">
                    <h4
                      className="font-bold text-sm mb-2"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      RANK SYSTEM
                    </h4>
                    <p
                      className="text-gray-300 text-xs"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      Verified Score Requirements
                    </p>
                  </div>
                  <div className="space-y-2">
                    {RANK_TIERS.map((rank, _index) => (
                      <div key={rank.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <img
                            src={rank.image}
                            alt={`${rank.name} Rank`}
                            className="w-6 h-6 object-contain"
                          />
                          <span
                            className="font-medium text-xs"
                            style={{
                              fontFamily: 'Montserrat, sans-serif',
                              color: rank.name === userRank.name ? rank.color : 'white',
                            }}
                          >
                            {rank.name}
                          </span>
                        </div>
                        <span
                          className="text-xs font-bold"
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            color: rank.name === userRank.name ? rank.color : '#e84c04',
                          }}
                        >
                          {rank.max === Infinity ? `${rank.min}+` : `${rank.min}-${rank.max}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black/95"></div>
                </div>
              </div>

              <h3
                className="text-xl font-bold mb-2"
                style={{ fontFamily: 'Montserrat, sans-serif', color: userRank.color }}
              >
                {userRank.name.toUpperCase()}
              </h3>
            </div>
          </div>
        </div>

        {/* Orange Divider */}
        <div className="h-1 mb-6" style={{ backgroundColor: '#e84c04' }}></div>

        {/* Stats Section */}
        <div
          className="bg-[#131313]/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-600/30 border-b-4"
          style={{ borderBottomColor: '#e84c04' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <Tooltip text="Best verified scores from official events or admin-verified submissions. These scores are used for official rankings and achievements.">
                <p
                  className="text-gray-300 text-sm mb-1 cursor-help hover:text-gray-200 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  VERIFIED SCORE
                </p>
              </Tooltip>
              <p
                className="text-white text-lg font-bold"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {overallVerifiedTotal}
              </p>
            </div>
            <div className="text-center relative">
              <div
                className="absolute left-0 top-1/2 transform -translate-y-1/2 w-px h-8 hidden md:block"
                style={{ backgroundColor: '#e84c04' }}
              ></div>
              <Tooltip text="Overall performance score combining all best scores across all events. Includes both verified and unverified scores.">
                <p
                  className="text-gray-300 text-sm mb-1 cursor-help hover:text-gray-200 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  TOTAL SCORE
                </p>
              </Tooltip>
              <p
                className="text-white text-lg font-bold"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {overallTotal}
              </p>
            </div>
            <div className="text-center relative">
              <div
                className="absolute left-0 top-1/2 transform -translate-y-1/2 w-px h-8 hidden md:block"
                style={{ backgroundColor: '#e84c04' }}
              ></div>
              <Tooltip text="Average performance across strength events: Squat, Bench Press, and Deadlift. Format: Total/Verified (all scores vs verified-only scores).">
                <p
                  className="text-gray-300 text-sm mb-1 cursor-help hover:text-gray-200 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  STRENGTH
                </p>
              </Tooltip>
              <p className="text-lg font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <span className="text-white">{strengthTotalAll}</span>
                <span className="text-gray-400">/</span>
                <span style={{ color: '#4682B4' }}>{strengthTotalVerified}</span>
              </p>
            </div>
            <div className="text-center relative">
              <div
                className="absolute left-0 top-1/2 transform -translate-y-1/2 w-px h-8 hidden md:block"
                style={{ backgroundColor: '#e84c04' }}
              ></div>
              <Tooltip text="Average performance across endurance events: Rowing 500m, Rowing 4min, Bike 500m, and Ski 500m. Format: Total/Verified (all scores vs verified-only scores).">
                <p
                  className="text-gray-300 text-sm mb-1 cursor-help hover:text-gray-200 transition-colors"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  ENDURANCE
                </p>
              </Tooltip>
              <p className="text-lg font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <span className="text-white">{enduranceTotalAll}</span>
                <span className="text-gray-400">/</span>
                <span style={{ color: '#4682B4' }}>{enduranceTotalVerified}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div
          className="bg-[#131313]/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-600/30 border-b-4"
          style={{ borderBottomColor: '#e84c04' }}
        >
          <h2
            className="text-white text-2xl font-bold mb-6 text-center"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            ACHIEVEMENTS
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Show competitor achievement */}
            {competitorAchievement && (
              <div className="text-center group relative">
                <div className="w-16 h-16 mx-auto mb-2">
                  <img
                    src={competitorAchievement.achievement.image}
                    alt={competitorAchievement.achievement.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p
                  className="text-white text-sm font-bold"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {competitorAchievement.achievement.name}
                </p>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {competitorAchievement.achievement.description}
                </div>
              </div>
            )}

            {/* Show highest score achievement */}
            {highestScoreAchievement && (
              <div className="text-center group relative">
                <div className="w-16 h-16 mx-auto mb-2">
                  <img
                    src={highestScoreAchievement.achievement.image}
                    alt={highestScoreAchievement.achievement.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p
                  className="text-white text-sm font-bold"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {highestScoreAchievement.achievement.name}
                </p>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {highestScoreAchievement.achievement.description}
                </div>
              </div>
            )}

            {/* Show specialist achievements */}
            {specialistAchievements.map((achievementResult) => (
              <div key={achievementResult.achievement.id} className="text-center group relative">
                <div className="w-16 h-16 mx-auto mb-2">
                  <img
                    src={achievementResult.achievement.image}
                    alt={achievementResult.achievement.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p
                  className="text-white text-sm font-bold"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {achievementResult.achievement.name.split(' ')[0]}
                </p>
                <p
                  className="text-gray-300 text-xs"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {achievementResult.achievement.name.split(' ')[1]}
                </p>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {achievementResult.achievement.description}
                </div>
              </div>
            ))}

            {/* Show placeholder if no achievements */}
            {!competitorAchievement &&
              !highestScoreAchievement &&
              specialistAchievements.length === 0 && (
                <div className="col-span-5 text-center py-8">
                  <p
                    className="text-gray-400 text-sm"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Complete events to earn achievements
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Performance Profile Section */}
        <div
          className="bg-[#131313]/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-600/30 border-b-4"
          style={{ borderBottomColor: '#e84c04' }}
        >
          <button
            onClick={() => setPerformanceProfileOpen(!performanceProfileOpen)}
            className="w-full text-left"
          >
            <h2
              className="text-white text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              PERFORMANCE PROFILE
              <span
                className="text-lg transition-transform duration-200"
                style={{
                  transform: performanceProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  color: '#e84c04',
                }}
              >
                ▼
              </span>
            </h2>
          </button>
          {performanceProfileOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <CustomRadarChart
                scores={bestVerifiedScoresByType}
                title="VERIFIED SCORES"
                color="#4682B4"
              />
              <CustomRadarChart scores={bestScoresByType} title="ALL SCORES" color="#e84c04" />
            </div>
          )}
        </div>

        {/* Detailed Scores */}
        {allScores.length > 0 && (
          <div
            className="bg-[#131313]/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-600/30 border-b-4"
            style={{ borderBottomColor: '#e84c04' }}
          >
            <button
              onClick={() => setDetailedScoresOpen(!detailedScoresOpen)}
              className="w-full text-left"
            >
              <h2
                className="text-white text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                DETAILED SCORES
                <span
                  className="text-lg transition-transform duration-200"
                  style={{
                    transform: detailedScoresOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: '#e84c04',
                  }}
                >
                  ▼
                </span>
              </h2>
            </button>
            {detailedScoresOpen && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...strengthTypes, ...enduranceTypes].map(renderScoreCard)}
              </div>
            )}
          </div>
        )}

        {/* Social Media Image Generator Modal */}
        {isImageGeneratorModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#131313] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-600/30">
              <div className="flex justify-between items-center mb-6">
                <h2
                  className="text-white text-2xl font-bold"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  EXPORT PROFILE
                </h2>
                <button
                  onClick={() => setIsImageGeneratorModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <SocialMediaImageGenerator
                user={user}
                overallTotal={overallTotal}
                overallVerifiedTotal={overallVerifiedTotal}
                userRank={userRank}
                strengthTotalAll={strengthTotalAll}
                strengthTotalVerified={strengthTotalVerified}
                enduranceTotalAll={enduranceTotalAll}
                enduranceTotalVerified={enduranceTotalVerified}
                userAchievements={userAchievements}
                competitorAchievement={competitorAchievement}
                highestScoreAchievement={highestScoreAchievement}
                specialistAchievements={specialistAchievements}
                bestVerifiedScoresByType={bestVerifiedScoresByType}
                bestScoresByType={bestScoresByType}
              />
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center">
          <h3
            className="text-2xl font-bold mb-6 uppercase"
            style={{ fontFamily: 'Montserrat, sans-serif', color: '#e84c04' }}
          >
            READY TO ENTER THE ARENA?
          </h3>
          <Link
            href="/"
            className="inline-flex items-center px-12 py-4 font-bold rounded-xl shadow-lg"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              backgroundColor: '#e84c04',
              color: 'black',
            }}
          >
            BECOME A CHALLENGER
          </Link>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#131313]/70 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md border border-gray-600/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-orange-400 text-lg">🔗</span>
                </div>
                <h2
                  className="text-white text-xl font-bold"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Share Profile
                </h2>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Link */}
              <div>
                <label
                  className="block text-gray-300 text-sm font-medium mb-2"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Profile Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/public/profile/${params.userid}`}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-lg text-white text-sm focus:outline-none"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-3 text-white rounded-lg font-medium transition-colors"
                    style={{ fontFamily: 'Montserrat, sans-serif', backgroundColor: '#e84c04' }}
                  >
                    {copySuccess ? '✓' : 'Copy'}
                  </button>
                </div>
                {copySuccess && (
                  <p
                    className="text-green-400 text-xs mt-1"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Link copied to clipboard!
                  </p>
                )}
              </div>

              {/* QR Code */}
              {qrCodeDataURL && (
                <div className="text-center">
                  <label
                    className="block text-gray-300 text-sm font-medium mb-3"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    QR Code
                  </label>
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img src={qrCodeDataURL} alt="QR Code for profile" className="w-48 h-48" />
                  </div>
                  <p
                    className="text-gray-400 text-xs mt-2"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Scan to visit profile
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-6 py-2 text-white rounded-lg font-medium transition-colors"
                style={{ fontFamily: 'Montserrat, sans-serif', backgroundColor: '#e84c04' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
