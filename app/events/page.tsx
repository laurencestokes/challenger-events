'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeSection from '@/components/WelcomeSection';
import { EventCardSkeleton } from '@/components/SkeletonLoaders';
import { isEventWithinDistance } from '@/utils/postcodeUtils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EVENT_TYPES } from '@/constants/eventTypes';
import Link from 'next/link';
import Image from 'next/image';
import { FiMapPin, FiCalendar, FiUsers, FiFilter, FiSearch, FiChevronDown } from 'react-icons/fi';
import { Score } from '@/lib/firestore';

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: unknown | null;
  endDate: unknown | null;
  scope?: 'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY';
  country?: string;
  postcode?: string;
  description?: string;
  isTeamEvent: boolean;
  maxTeamSize?: number;
}

interface EventWithScores extends Event {
  scores?: Score[];
}

interface FilterState {
  scope: string;
  dateRange: string;
  postcode: string;
  searchTerm: string;
  distance: string;
  distanceUnit: 'miles' | 'km';
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalScore, setTotalScore] = useState(0);
  const [verifiedScore, setVerifiedScore] = useState(0);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    scope: 'ALL',
    dateRange: 'ALL',
    postcode: '',
    searchTerm: '',
    distance: '',
    distanceUnit: 'miles',
  });

  useEffect(() => {
    fetchEvents();
    if (user?.role === 'COMPETITOR') {
      fetchScores();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/events/available');
      setEvents(Array.isArray(response) ? response : []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events';
      setError(errorMessage);
      setEvents([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScores = async () => {
    try {
      setIsLoadingScores(true);

      // Fetch all scores
      const allScoresResponse = await api
        .get('/api/user/all-scores')
        .catch(() => ({ success: false, data: [] }));
      const personalScores = allScoresResponse.success ? allScoresResponse.data : [];

      // Fetch user's events with scores
      const userEventsResponse = await api.get('/api/user/events').catch(() => []);
      const userEvents = userEventsResponse || [];

      // Flatten event scores into activity scores, attaching event info
      type ScoreWithEvent = Score & { event?: Event; testId?: string };
      const eventActivityScores: ScoreWithEvent[] = [];
      (userEvents as EventWithScores[]).forEach((event: EventWithScores) => {
        (event.scores || []).forEach((score: Score) => {
          eventActivityScores.push({ ...score, event });
        });
      });

      // Combine with personal scores
      const allScores: ScoreWithEvent[] = [...eventActivityScores, ...personalScores];

      // Get best scores by event type
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
      const total = Object.values(bestScoresByType).reduce((sum, score) => sum + score, 0);
      const verified = Object.values(bestVerifiedScoresByType).reduce(
        (sum, score) => sum + score,
        0,
      );

      setTotalScore(total);
      setVerifiedScore(verified);
    } catch (error: unknown) {
      console.error('Error fetching scores:', error);
    } finally {
      setIsLoadingScores(false);
    }
  };

  const parseFirebaseDate = (date: unknown): Date | null => {
    if (!date) return null;

    if (typeof date === 'object' && date !== null) {
      if ('seconds' in date && typeof date.seconds === 'number') {
        return new Date(date.seconds * 1000);
      } else if ('toDate' in date && typeof date.toDate === 'function') {
        return date.toDate();
      } else {
        return null;
      }
    } else if (typeof date === 'string') {
      return new Date(date);
    } else if (date instanceof Date) {
      return date;
    } else if (typeof date === 'number') {
      return new Date(date);
    } else {
      return null;
    }
  };

  const formatDate = (date: unknown): string => {
    const parsedDate = parseFirebaseDate(date);
    if (!parsedDate) return 'TBD';

    return parsedDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getScopeLabel = (scope?: string): string => {
    switch (scope) {
      case 'PUBLIC':
        return 'Public';
      case 'ORGANIZATION':
        return 'Organization';
      case 'GYM':
        return 'Gym';
      case 'INVITE_ONLY':
        return 'Invite Only';
      default:
        return 'Public';
    }
  };

  const getScopeColor = (scope?: string): string => {
    switch (scope) {
      case 'PUBLIC':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'ORGANIZATION':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'GYM':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'INVITE_ONLY':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  // State for distance-filtered events
  const [distanceFilteredEvents, setDistanceFilteredEvents] = useState<Event[]>([]);
  const [isDistanceFiltering, setIsDistanceFiltering] = useState(false);

  // Handle distance filtering asynchronously
  useEffect(() => {
    const applyDistanceFilter = async () => {
      if (!filters.postcode || !filters.distance) {
        setDistanceFilteredEvents(events || []);
        return;
      }

      setIsDistanceFiltering(true);
      const maxDistance = parseFloat(filters.distance);

      if (isNaN(maxDistance)) {
        setDistanceFilteredEvents(events || []);
        setIsDistanceFiltering(false);
        return;
      }

      try {
        const filteredEvents = [];
        for (const event of events || []) {
          if (event.postcode) {
            const isWithinDistance = await isEventWithinDistance(
              event.postcode,
              filters.postcode,
              maxDistance,
              filters.distanceUnit,
            );
            if (isWithinDistance) {
              filteredEvents.push(event);
            }
          }
        }
        setDistanceFilteredEvents(filteredEvents);
      } catch (error) {
        console.error('Error filtering by distance:', error);
        setDistanceFilteredEvents(events || []);
      } finally {
        setIsDistanceFiltering(false);
      }
    };

    applyDistanceFilter();
  }, [events, filters.postcode, filters.distance, filters.distanceUnit]);

  // Apply non-distance filters to the distance-filtered events
  const filteredEvents = distanceFilteredEvents.filter((event) => {
    // Scope filter
    if (filters.scope !== 'ALL' && event.scope !== filters.scope) {
      return false;
    }

    // Search term filter
    if (
      filters.searchTerm &&
      !event.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Simple postcode filter (when no distance is specified)
    if (filters.postcode && event.postcode && !filters.distance) {
      if (!event.postcode.toLowerCase().includes(filters.postcode.toLowerCase())) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange !== 'ALL') {
      const now = new Date();
      const eventStartDate = parseFirebaseDate(event.startDate);

      if (!eventStartDate) return false;

      switch (filters.dateRange) {
        case 'THIS_WEEK':
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return eventStartDate >= now && eventStartDate <= weekFromNow;
        case 'THIS_MONTH':
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          return eventStartDate >= now && eventStartDate <= monthFromNow;
        case 'NEXT_3_MONTHS':
          const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
          return eventStartDate >= now && eventStartDate <= threeMonthsFromNow;
        case 'NEXT_12_MONTHS':
          const twelveMonthsFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          return eventStartDate >= now && eventStartDate <= twelveMonthsFromNow;
        case '2025':
          const year2025Start = new Date('2025-01-01');
          const year2025End = new Date('2025-12-31T23:59:59');
          return eventStartDate >= year2025Start && eventStartDate <= year2025End;
        case '2026':
          const year2026Start = new Date('2026-01-01');
          const year2026End = new Date('2026-12-31T23:59:59');
          return eventStartDate >= year2026Start && eventStartDate <= year2026End;
        case '2027':
          const year2027Start = new Date('2027-01-01');
          const year2027End = new Date('2027-12-31T23:59:59');
          return eventStartDate >= year2027Start && eventStartDate <= year2027End;
        default:
          return true;
      }
    }

    return true;
  });

  const clearFilters = () => {
    setFilters({
      scope: 'ALL',
      dateRange: 'ALL',
      postcode: '',
      searchTerm: '',
      distance: '',
      distanceUnit: 'miles',
    });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== 'ALL' && value !== '',
  ).length;

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
        <Header />
        <div className="flex-1">
          <div className="container mx-auto px-4 py-8">
            {/* Welcome Section */}
            <WelcomeSection
              showMetrics={user?.role === 'COMPETITOR'}
              verifiedScore={verifiedScore}
              totalScore={totalScore}
              isLoading={isLoadingScores}
            />

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Upcoming Events</h1>
              <p className="text-gray-400">Discover and join competitions</p>
            </div>

            {/* Search and Filters */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-8">
              {/* Search Bar */}
              <div className="relative mb-4">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                >
                  <FiFilter />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                  <FiChevronDown
                    className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
                  />
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-orange-400 hover:text-orange-300 text-sm"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Filter Options */}
              {showFilters && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Scope</label>
                      <select
                        value={filters.scope}
                        onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="ALL">All Events</option>
                        <option value="PUBLIC">Public</option>
                        {user?.organizationId && <option value="ORGANIZATION">Organization</option>}
                        {user?.gymId && <option value="GYM">Gym</option>}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Date Range
                      </label>
                      <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="ALL">All Dates</option>
                        <option value="THIS_WEEK">This Week</option>
                        <option value="THIS_MONTH">This Month</option>
                        <option value="NEXT_3_MONTHS">Next 3 Months</option>
                        <option value="NEXT_12_MONTHS">Next 12 Months</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Location Filter
                      </label>
                      <input
                        type="text"
                        placeholder="Enter postcode to find nearby events"
                        value={filters.postcode}
                        onChange={(e) => setFilters({ ...filters, postcode: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-400 mt-1">Find events near this location</p>
                    </div>
                  </div>

                  {/* Distance Filter */}
                  {filters.postcode && (
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white mb-3">
                        Distance from Postcode
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Maximum Distance
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 10"
                            min="1"
                            max="500"
                            value={filters.distance}
                            onChange={(e) => setFilters({ ...filters, distance: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-400 mt-1">Events within this distance</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Unit
                          </label>
                          <select
                            value={filters.distanceUnit}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                distanceUnit: e.target.value as 'miles' | 'km',
                              })
                            }
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="miles">Miles</option>
                            <option value="km">Kilometers</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Leave empty to show all events with matching postcodes, or enter a distance
                        to find events within that radius.
                      </p>
                      {isDistanceFiltering && (
                        <div className="flex items-center space-x-2 mt-2 text-orange-400 text-xs">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-400"></div>
                          <span>Calculating distances...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Events Grid */}
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {isLoading || isDistanceFiltering ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden"
                  >
                    {/* Event Image */}
                    <div className="relative h-48">
                      <Image
                        src="/upcoming_events_placeholder.png"
                        alt={event.name}
                        fill
                        className="object-cover"
                      />
                      {/* Dark overlay */}
                      <div className="absolute inset-0 bg-black/30" />

                      {/* Scope Badge */}
                      <div className="absolute top-4 left-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getScopeColor(event.scope)}`}
                        >
                          {getScopeLabel(event.scope)}
                        </span>
                      </div>

                      {/* Team Event Badge */}
                      {event.isTeamEvent && (
                        <div className="absolute top-4 right-4">
                          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-medium">
                            <FiUsers className="inline mr-1" />
                            Team Event
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Event Content */}
                    <div className="p-6">
                      <h3 className="text-white font-bold text-xl mb-2">{event.name}</h3>

                      {event.description && (
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Event Details */}
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-300 text-sm">
                          <FiCalendar className="mr-2" />
                          <span>{formatDate(event.startDate)}</span>
                        </div>

                        {event.postcode && (
                          <div className="flex items-center text-gray-300 text-sm">
                            <FiMapPin className="mr-2" />
                            <span>{event.postcode}</span>
                            <span className="ml-1">🇬🇧</span>
                          </div>
                        )}

                        {event.isTeamEvent && event.maxTeamSize && (
                          <div className="flex items-center text-gray-300 text-sm">
                            <FiUsers className="mr-2" />
                            <span>Max {event.maxTeamSize} members</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FiCalendar className="mx-auto text-4xl mb-2" />
                  <p className="text-lg">No events found</p>
                  <p className="text-sm">Try adjusting your filters or check back later</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
