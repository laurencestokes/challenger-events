'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserScores } from '@/lib/api-client';
import { beautifyRawScore } from '@/utils/scoring';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/LoadingSpinner';
import { EVENT_TYPES } from '@/constants/eventTypes';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface Score {
  id: string;
  eventId: string;
  eventName: string;
  activityId: string;
  activityName: string;
  rawScore: number;
  calculatedScore: number;
  timestamp: unknown;
  testId?: string;
  reps?: number; // Added reps for personal scores
}

export default function UserScoresPage() {
  const { user } = useAuth();
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('');

  useEffect(() => {
    if (user) {
      fetchScores();
    }
  }, [user]);

  const fetchScores = async () => {
    try {
      setLoading(true);
      const response = await getUserScores();
      if (response.success) {
        setScores(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching scores:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map activityId to canonical type (e.g., 'squat', 'bench', etc.)
  const getCanonicalActivity = (score: Score) => {
    // Try to match by activityId to EVENT_TYPES
    const eventType = EVENT_TYPES.find((et) => et.id === score.activityId);
    return eventType ? eventType.name : score.activityName || score.activityId;
  };

  // Get unique canonical activities
  const canonicalActivities = Array.from(new Set(scores.map(getCanonicalActivity))).sort();

  // Helper: get canonical event id for a score (personal or event), with fuzzy matching
  const getCanonicalEventId = (score: Score): string | undefined => {
    if (score.testId && EVENT_TYPES.some((et) => et.id === score.testId)) return score.testId;
    if (score.activityId && EVENT_TYPES.some((et) => et.id === score.activityId))
      return score.activityId;
    if (score.activityName) {
      // Fuzzy match: if activityName contains canonical event name
      const match = EVENT_TYPES.find((et) =>
        score.activityName.toLowerCase().includes(et.name.toLowerCase()),
      );
      if (match) return match.id;
    }
    return undefined;
  };

  // Helper: get canonical event name for a score (personal or event)
  const getCanonicalEventName = (score: Score) => {
    const id = getCanonicalEventId(score);
    const eventType = EVENT_TYPES.find((et) => et.id === id);
    return eventType ? eventType.name : score.activityName || score.activityId;
  };

  // Canonical activities present in user's scores, in EVENT_TYPES order
  const presentEventTypes = EVENT_TYPES.filter((et) =>
    scores.some((score) => getCanonicalEventId(score) === et.id),
  );

  // Format raw score with beautifyRawScore and reps (always show x reps for lifts)
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

  // Robust date formatting (move this above filteredScores)
  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'Unknown date';
    let date: Date | null = null;
    try {
      if (typeof timestamp === 'object' && timestamp !== null) {
        if (typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
          date = (timestamp as { toDate: () => Date }).toDate();
        } else if (timestamp instanceof Date) {
          date = timestamp;
        } else if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
          // Firestore Timestamp object
          date = new Date(timestamp.seconds * 1000);
        }
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      if (!date || isNaN(date.getTime())) return 'Unknown date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Filtering logic: filter by canonical activity
  const filteredScores = scores
    .filter((score) => {
      const matchesSearch =
        (score.eventName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (score.activityName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (score.testId ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      const canonicalId = getCanonicalEventId(score);
      const matchesActivity = !activityFilter || canonicalId === activityFilter;
      return matchesSearch && matchesActivity;
    })
    // Sort by timestamp descending
    .sort((a, b) => {
      const dateA = a.timestamp ? new Date(formatDate(a.timestamp)).getTime() : 0;
      const dateB = b.timestamp ? new Date(formatDate(b.timestamp)).getTime() : 0;
      return dateB - dateA;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumbs */}
            <nav
              className="mb-6 text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <span>/</span>
              <Link href="/profile" className="hover:underline">
                Profile
              </Link>
              <span>/</span>
              <span className="text-gray-700 dark:text-gray-200 font-semibold">All Scores</span>
            </nav>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                All My Scores
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View and search through all your submitted scores
              </p>
            </div>

            {/* Filters */}
            <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search events, activities, or test IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Activities</option>
                  {presentEventTypes.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {scores.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Scores</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {canonicalActivities.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Activities</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Array.from(new Set(scores.map((score) => score.eventId))).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Events</div>
                </div>
              </Card>
            </div>

            {/* Scores List */}
            {filteredScores.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  {scores.length === 0 ? (
                    <p>No scores found. Start participating in events to see your scores here!</p>
                  ) : (
                    <p>No scores match your current filters.</p>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredScores.map((score) => (
                  <Card key={score.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded font-semibold">
                            {getCanonicalEventName(score)}
                          </span>
                          {score.eventName && (
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {score.eventName}
                            </h3>
                          )}
                          {score.testId && (
                            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                              {score.testId}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(score.timestamp)}
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 sm:ml-6 text-right">
                        <div className="flex flex-col items-end">
                          <div className="text-2xl font-bold text-primary-500 dark:text-primary-400 flex items-baseline">
                            {score.calculatedScore.toFixed(1)}
                            <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                              Challenger Score
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatRawScoreWithReps(score)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
