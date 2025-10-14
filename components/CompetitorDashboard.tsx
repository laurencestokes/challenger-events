'use client';

import { useState, useEffect, ComponentProps } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api-client';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiPlus,
  FiUsers,
  FiCalendar,
  FiChevronDown,
  FiMapPin,
  FiClock,
  FiExternalLink,
  FiCheck,
} from 'react-icons/fi';
import PerformanceGraph from './PerformanceGraph';
import JoinEventModal from './JoinEventModal';
import { EventCardSkeleton, TeamCardSkeleton, PerformanceGraphSkeleton } from './SkeletonLoaders';
import { beautifyRawScore } from '../utils/scoring';
import { EVENT_TYPES } from '../constants/eventTypes';

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: unknown;
  imageUrl?: string;
  location?: string;
}

interface Score {
  id: string;
  eventId?: string | null;
  eventName?: string | null;
  activityId: string;
  activityName?: string | null;
  rawScore: number; // Note: all-scores endpoint uses rawScore instead of rawValue
  rawValue?: number; // For PerformanceGraph compatibility
  calculatedScore: number;
  reps?: number;
  timestamp: unknown; // Note: all-scores endpoint uses timestamp instead of submittedAt
  submittedAt?: unknown; // For PerformanceGraph compatibility
  testId?: string;
  verified?: boolean; // Whether the score is verified
  notes?: string;
  workoutName?: string;
  event?: {
    name: string;
  };
}

interface EventWithScores {
  id: string;
  name: string;
  code: string;
  status: string;
  joinedAt: unknown;
  scores: Score[];
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  userRole?: 'CAPTAIN' | 'MEMBER' | null;
  isMember?: boolean;
  logoUrl?: string;
}

export default function CompetitorDashboard() {
  const { user } = useAuth();
  const [_events, setEvents] = useState<Event[]>([]);
  const [userEvents, setUserEvents] = useState<EventWithScores[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentScores, setRecentScores] = useState<Score[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [verifiedScore, setVerifiedScore] = useState(0);
  const [_isLoading, setIsLoading] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingUserEvents, setIsLoadingUserEvents] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [_error, setError] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isPerformanceGraphExpanded, setIsPerformanceGraphExpanded] = useState(false);
  const [isScoreHistoryExpanded, setIsScoreHistoryExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all events
        const eventsData = await api.get('/api/events');
        setEvents(eventsData);

        // Fetch user's enrolled events
        const userEventsData = await api.get('/api/user/events').catch(() => []);
        setUserEvents(userEventsData);
        setIsLoadingUserEvents(false);

        // Fetch user's teams
        const teamsResponse = await api.get('/api/teams/user').catch(() => ({ teams: [] }));
        setTeams(teamsResponse.teams || []);
        setIsLoadingTeams(false);

        // Fetch upcoming events (events available to join)
        const upcomingEventsData = await api.get('/api/events/available').catch(() => []);
        setUpcomingEvents(upcomingEventsData);
        setIsLoadingEvents(false);

        // Fetch all scores (both personal and event scores)
        const allScoresResponse = await api
          .get('/api/user/all-scores')
          .catch(() => ({ success: false, data: [] }));
        const allScores: Score[] = allScoresResponse.success ? allScoresResponse.data : [];

        // Sort by submission date (most recent first) and take the last 50 for the graph
        const sortedScores = allScores
          .sort((a, b) => {
            // Robust date parsing function
            const parseTimestamp = (timestamp: unknown): number => {
              if (!timestamp) return 0;

              let date: Date;
              try {
                if (typeof timestamp === 'object' && timestamp !== null) {
                  if (
                    'seconds' in timestamp &&
                    typeof (timestamp as { seconds: number }).seconds === 'number'
                  ) {
                    // Firestore Timestamp object
                    date = new Date((timestamp as { seconds: number }).seconds * 1000);
                  } else if (
                    'toDate' in timestamp &&
                    typeof (timestamp as { toDate: () => Date }).toDate === 'function'
                  ) {
                    date = (timestamp as { toDate: () => Date }).toDate();
                  } else {
                    return 0;
                  }
                } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                  date = new Date(timestamp);
                } else if (timestamp instanceof Date) {
                  date = timestamp;
                } else {
                  return 0;
                }

                return isNaN(date.getTime()) ? 0 : date.getTime();
              } catch {
                return 0;
              }
            };

            const dateA = parseTimestamp(a.timestamp);
            const dateB = parseTimestamp(b.timestamp);
            return dateB - dateA; // Most recent first
          })
          .slice(0, 50)
          .map((score) => ({
            ...score,
            rawValue: score.rawScore || 0, // Map rawScore to rawValue for PerformanceGraph, ensure it's a number
            submittedAt: score.timestamp, // Map timestamp to submittedAt for PerformanceGraph
            verified: score.verified || false, // Ensure verified is boolean
          }));

        setRecentScores(sortedScores);

        // Calculate verified score (sum of verified scores only)
        // A score is considered verified if it's from an event OR has verified flag set to true
        const verifiedScores = allScores.filter((score) => score.eventId || score.verified);
        const verified = verifiedScores.reduce(
          (sum, score) => sum + (score.calculatedScore || 0),
          0,
        );
        setVerifiedScore(verified);

        // Calculate total score (sum of all calculated scores - both verified and unverified)
        const total = allScores.reduce((sum, score) => sum + (score.calculatedScore || 0), 0);
        setTotalScore(total);
      } catch (error: unknown) {
        console.error('Error fetching data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        setIsLoadingScores(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleJoinEventSuccess = () => {
    // Refresh the data to show the newly joined event
    window.location.reload();
  };

  const formatEventDate = (dateString: unknown) => {
    if (!dateString) return 'TBD';

    let date: Date;

    // Handle Firestore Timestamp objects
    if (typeof dateString === 'object' && dateString !== null) {
      // Check if it's a Firestore Timestamp with seconds and nanoseconds
      if (
        'seconds' in dateString &&
        typeof (dateString as { seconds: number }).seconds === 'number'
      ) {
        date = new Date((dateString as { seconds: number }).seconds * 1000);
      } else if (
        'toDate' in dateString &&
        typeof (dateString as { toDate: () => Date }).toDate === 'function'
      ) {
        date = (dateString as { toDate: () => Date }).toDate();
      } else {
        return 'TBD';
      }
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'TBD';
      }
    } else if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'number') {
      date = new Date(dateString);
    } else {
      return 'TBD';
    }

    // Format as "17th Jan 2025"
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();

    // Add ordinal suffix to day
    const getOrdinalSuffix = (day: number) => {
      if (day >= 11 && day <= 13) {
        return 'th';
      }
      switch (day % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    };

    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  };

  // Colors for event card footers (cycling through)
  const eventFooterColors = [
    'bg-red-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-primary-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];

  const getEventFooterColor = (index: number) => {
    return eventFooterColors[index % eventFooterColors.length];
  };

  const getTeamFooterColor = (index: number) => {
    return eventFooterColors[index % eventFooterColors.length];
  };

  // Helper functions for score formatting (copied from scores page)
  const getCanonicalEventId = (score: Score): string | undefined => {
    if (score.testId && EVENT_TYPES.some((et) => et.id === score.testId)) return score.testId;
    if (score.activityId && EVENT_TYPES.some((et) => et.id === score.activityId))
      return score.activityId;
    if (score.activityName) {
      // Fuzzy match: if activityName contains canonical event name
      const match = EVENT_TYPES.find((et) =>
        score.activityName?.toLowerCase().includes(et.name.toLowerCase()),
      );
      if (match) return match.id;
    }
    return undefined;
  };

  const getCanonicalEventName = (score: Score) => {
    const id = getCanonicalEventId(score);
    const eventType = EVENT_TYPES.find((et) => et.id === id);
    return eventType ? eventType.name : score.activityName || score.activityId;
  };

  const formatRawScoreWithReps = (score: Score) => {
    const canonicalId = getCanonicalEventId(score) || '';
    const eventType = EVENT_TYPES.find((et) => et.id === canonicalId);
    // For lifts, always show x reps (default to 1)
    if (eventType && eventType.inputType === 'WEIGHT') {
      const reps = score.reps ?? 1;
      return beautifyRawScore(score.rawScore, canonicalId, reps);
    }
    // For other events, just use beautifyRawScore
    return beautifyRawScore(score.rawScore, canonicalId);
  };

  return (
    <div className="" style={{ backgroundColor: '#0F0F0F' }}>
      <div className="container mx-auto px-4 py-8">
        {/* User Profile Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mr-4">
              <span className="text-white text-xl font-bold">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-sm">Welcome Back</p>
              <h1 className="text-white text-2xl font-bold">{user?.name || user?.email}</h1>
            </div>
          </div>
          <div className="text-right space-y-3">
            <div>
              <p className="text-white font-medium text-base mb-1">Verified Score</p>
              {isLoadingScores ? (
                <div className="bg-green-900/30 border border-green-700/50 px-4 py-2 rounded-lg">
                  <div className="h-6 bg-gray-700 rounded animate-pulse"></div>
                </div>
              ) : (
                <div className="bg-green-900/30 border border-green-700/50 px-4 py-2 rounded-lg">
                  <span className="text-green-400 font-bold">
                    {verifiedScore.toLocaleString()} Pts
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-medium text-base mb-1">Total Score</p>
              {isLoadingScores ? (
                <div
                  className="px-4 py-2 rounded-lg"
                  style={{
                    background:
                      'linear-gradient(90deg, #E5965E 0%, #F26004 35.58%, #C10901 67.79%, #240100 100%)',
                  }}
                >
                  <div className="h-6 bg-white/20 rounded animate-pulse"></div>
                </div>
              ) : (
                <div
                  className="px-4 py-2 rounded-lg"
                  style={{
                    background:
                      'linear-gradient(90deg, #E5965E 0%, #F26004 35.58%, #C10901 67.79%, #240100 100%)',
                  }}
                >
                  <span className="text-white font-bold">{totalScore.toLocaleString()} Pts</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Upcoming Events Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-2xl font-bold">Upcoming Events</h2>
                <Link
                  href="/events"
                  className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1 rounded-lg transition-colors"
                >
                  More
                </Link>
              </div>
              <div
                className={`flex space-x-4 pb-4 ${isLoadingEvents ? 'overflow-hidden' : 'overflow-x-auto'}`}
              >
                {isLoadingEvents ? (
                  <>
                    <EventCardSkeleton />
                    <EventCardSkeleton />
                  </>
                ) : upcomingEvents.length > 0 ? (
                  upcomingEvents.slice(0, 2).map((event, index) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 relative overflow-hidden hover:scale-105 transition-transform duration-200"
                    >
                      {/* Event Image */}
                      <div className="absolute inset-0">
                        {event.imageUrl ? (
                          <Image
                            src={event.imageUrl}
                            alt={event.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Image
                            src="/upcoming_events_placeholder.png"
                            alt={event.name}
                            fill
                            className="object-cover"
                          />
                        )}
                        {/* Dark overlay for text readability */}
                        <div className="absolute inset-0 bg-black/30" />
                      </div>

                      {/* Event Title Overlay */}
                      <div className="absolute top-4 left-4 right-4 z-10">
                        <h3 className="text-white font-bold text-lg leading-tight">{event.name}</h3>
                      </div>

                      {/* Colored Footer */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 ${getEventFooterColor(index)} p-3`}
                      >
                        <div className="flex items-center space-x-2 text-white text-sm">
                          <FiCalendar className="w-4 h-4" />
                          <span>{formatEventDate(event.startDate)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-white text-sm mt-1">
                          <FiMapPin className="w-4 h-4" />
                          <span>{event.location || 'Location TBD'}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <>
                    <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 relative overflow-hidden">
                      <Image
                        src="/upcoming_events_placeholder.png"
                        alt="No upcoming events"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="absolute top-4 left-4 right-4 z-10">
                        <h3 className="text-white font-bold text-lg leading-tight">
                          No upcoming events
                        </h3>
                      </div>
                      <div
                        className="absolute bottom-0 left-0 right-0 p-3"
                        style={{ backgroundColor: '#4682B4' }}
                      >
                        <div className="flex items-center space-x-2 text-white text-sm">
                          <FiCalendar className="w-4 h-4" />
                          <span>Check back later</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 relative overflow-hidden">
                      <Image
                        src="/upcoming_events_placeholder.png"
                        alt="More events coming"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="absolute top-4 left-4 right-4 z-10">
                        <h3 className="text-white font-bold text-lg leading-tight">
                          More events coming
                        </h3>
                      </div>
                      <div
                        className="absolute bottom-0 left-0 right-0 p-3"
                        style={{ backgroundColor: '#4682B4' }}
                      >
                        <div className="flex items-center space-x-2 text-white text-sm">
                          <FiCalendar className="w-4 h-4" />
                          <span>Stay tuned</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Teams Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-2xl font-bold">Teams</h2>
                <Link
                  href="/teams"
                  className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1 rounded-lg transition-colors"
                >
                  More
                </Link>
              </div>
              <div
                className={`flex space-x-4 pb-4 ${isLoadingTeams ? 'overflow-hidden' : 'overflow-x-auto'}`}
              >
                {/* User's Teams */}
                {isLoadingTeams ? (
                  <>
                    <TeamCardSkeleton />
                    <TeamCardSkeleton />
                  </>
                ) : teams.length > 0 ? (
                  teams.slice(0, 2).map((team, index) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 relative overflow-hidden hover:scale-105 transition-transform duration-200"
                    >
                      {/* Team Background/Logo */}
                      <div className="absolute inset-0">
                        {team.logoUrl ? (
                          <Image src={team.logoUrl} alt={team.name} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Image
                              src="/challenger-logo-no-text.png"
                              alt="Challenger logo"
                              width={80}
                              height={80}
                              className="opacity-80"
                            />
                          </div>
                        )}
                        {/* Dark overlay for text readability */}
                        <div className="absolute inset-0 bg-black/30" />
                      </div>

                      {/* Team Title Overlay */}
                      <div className="absolute top-4 left-4 right-4 z-10">
                        <h3 className="text-white font-bold text-lg leading-tight">{team.name}</h3>
                      </div>

                      {/* Team Info Footer */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 ${getTeamFooterColor(index)} p-3`}
                      >
                        <div className="flex items-center space-x-2 text-white text-sm">
                          <FiUsers className="w-4 h-4" />
                          <span>{team.userRole === 'CAPTAIN' ? 'Captain' : 'Member'}</span>
                        </div>
                        <div className="text-white text-sm mt-1 opacity-90">View Team</div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <>
                    <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-400 text-sm mb-2">No teams yet</p>
                        <p className="text-gray-500 text-xs">Create or join one</p>
                      </div>
                    </div>
                    <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-400 text-sm mb-2">Join a team</p>
                        <p className="text-gray-500 text-xs">Get started</p>
                      </div>
                    </div>
                  </>
                )}
                <Link
                  href="/teams"
                  className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors"
                >
                  <FiPlus className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-gray-400 text-sm">Create Team</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Upcoming Events Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-2xl font-bold">My Events</h2>
                <Link
                  href="/events"
                  className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1 rounded-lg transition-colors"
                >
                  More
                </Link>
              </div>
              <div
                className={`flex space-x-4 pb-4 ${isLoadingUserEvents ? 'overflow-hidden' : 'overflow-x-auto'}`}
              >
                {isLoadingUserEvents ? (
                  <>
                    <EventCardSkeleton />
                    <EventCardSkeleton />
                    <EventCardSkeleton />
                  </>
                ) : userEvents.length > 0 ? (
                  userEvents.slice(0, 3).map((event, index) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 relative overflow-hidden hover:scale-105 transition-transform duration-200"
                    >
                      {/* Event Image */}
                      <div className="absolute inset-0">
                        {event.imageUrl ? (
                          <Image
                            src={event.imageUrl}
                            alt={event.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Image
                            src="/event_placeholder.png"
                            alt={event.name}
                            fill
                            className="object-cover"
                          />
                        )}
                        {/* Dark overlay for text readability */}
                        <div className="absolute inset-0 bg-black/30" />
                      </div>

                      {/* Event Title Overlay */}
                      <div className="absolute top-4 left-4 right-4 z-10">
                        <h3 className="text-white font-bold text-lg leading-tight">{event.name}</h3>
                      </div>

                      {/* Colored Footer */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 ${getEventFooterColor(index)} p-3`}
                      >
                        <div className="flex items-center space-x-2 text-white text-sm">
                          <FiCalendar className="w-4 h-4" />
                          <span>{formatEventDate(event.startDate)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-white text-sm mt-1">
                          <FiMapPin className="w-4 h-4" />
                          <span>{event.location || 'Location TBD'}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <>
                    <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-400 text-sm mb-2">No events yet</p>
                        <Link
                          href="/events/join"
                          className="text-orange-400 text-xs hover:text-orange-300"
                        >
                          Join an event
                        </Link>
                      </div>
                    </div>
                    <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-400 text-sm mb-2">Discover events</p>
                        <Link
                          href="/events"
                          className="text-orange-400 text-xs hover:text-orange-300"
                        >
                          Browse all
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Join Event by Code Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-2xl font-bold">Join Event by Code</h2>
              </div>
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="w-full h-32 bg-primary-500 hover:bg-primary-600 rounded-2xl p-6 flex items-center space-x-4 transition-all"
              >
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <FiCalendar className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xl font-bold">Enter Event Code</span>
              </button>
            </div>
          </div>
        </div>

        {/* Performance Graph Section */}
        <div className="mt-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <button
              onClick={() => setIsPerformanceGraphExpanded(!isPerformanceGraphExpanded)}
              className="flex items-center justify-between w-full hover:opacity-80 transition-opacity"
            >
              <h2 className="text-white text-2xl font-bold">Performance Over Time</h2>
              <FiChevronDown
                className={`w-6 h-6 text-white transition-transform duration-200 ${
                  isPerformanceGraphExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isPerformanceGraphExpanded && (
              <>
                {isLoadingScores ? (
                  <PerformanceGraphSkeleton />
                ) : (
                  <div className="bg-gray-900/50 rounded-xl p-4">
                    <PerformanceGraph
                      scores={recentScores as ComponentProps<typeof PerformanceGraph>['scores']}
                      isLoading={false}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Score History Section */}
        <div className="mt-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <button
              onClick={() => setIsScoreHistoryExpanded(!isScoreHistoryExpanded)}
              className="flex items-center justify-between w-full hover:opacity-80 transition-opacity"
            >
              <h2 className="text-white text-2xl font-bold">Score History</h2>
              <FiChevronDown
                className={`w-6 h-6 text-white transition-transform duration-200 ${
                  isScoreHistoryExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isScoreHistoryExpanded && (
              <>
                {isLoadingScores ? (
                  <div className="space-y-3">
                    <div className="bg-gray-700/50 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                ) : recentScores.length > 0 ? (
                  <>
                    <div className="space-y-3 mb-4">
                      {recentScores.slice(0, 5).map((score) => {
                        const isVerified = score.eventId || score.verified;
                        return (
                          <div
                            key={score.id}
                            className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="px-2 py-1 text-xs bg-primary-500/20 text-primary-400 rounded font-semibold">
                                    {getCanonicalEventName(score)}
                                  </span>
                                  {score.eventName && (
                                    <span className="text-sm text-gray-300">{score.eventName}</span>
                                  )}
                                  {/* Verification Status Badge */}
                                  <span
                                    className={`px-2 py-1 text-xs rounded font-medium flex items-center space-x-1 ${
                                      isVerified
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                    }`}
                                  >
                                    {isVerified ? (
                                      <>
                                        <FiCheck className="w-3 h-3" />
                                        <span>Verified</span>
                                      </>
                                    ) : (
                                      <span>Unverified</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-gray-400">
                                  <FiClock className="w-3 h-3" />
                                  <span>{formatEventDate(score.timestamp)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-primary-400">
                                  {score.calculatedScore.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatRawScoreWithReps(score)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-center">
                      <Link
                        href="/profile/scores"
                        className="inline-flex items-center space-x-2 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
                      >
                        <span>View All Scores</span>
                        <FiExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">No scores yet</div>
                    <div className="text-gray-500 text-sm">
                      Start participating in events to see your scores here!
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Join Event Modal */}
      <JoinEventModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={handleJoinEventSuccess}
      />
    </div>
  );
}
