'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@lib/api-client';
import { queryKeys } from '@lib/queryKeys';
import Link from 'next/link';
import ProtectedRoute from '@components/ProtectedRoute';
import WelcomeSection from '@components/WelcomeSection';

interface Event {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: unknown;
  description?: string;
  brief?: string;
  participants?: Participant[];
  isTeamEvent?: boolean;
  teamScoringMethod?: 'SUM' | 'AVERAGE' | 'BEST';
  maxTeamSize?: number;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: string;
  age?: number;
  joinedAt: unknown;
  score?: number;
}

export default function EditEventBrief() {
  const params = useParams();
  const queryClient = useQueryClient();
  const [brief, setBrief] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const eventId = params.id as string;

  const {
    data: event,
    isLoading,
    error,
  } = useQuery<Event>({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => api.get(`/api/events/${eventId}`),
    enabled: !!eventId,
  });

  const resolvedBrief = brief ?? event?.brief ?? '';

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/api/events/${eventId}`, { brief: resolvedBrief }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      setSuccess('Brief updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const handleSave = () => saveMutation.mutate();

  const handlePreview = () => {
    // Open the brief page in a new tab for preview
    window.open(`/events/${eventId}/brief`, '_blank');
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 border-primary"></div>
              <p className="text-white text-lg">Loading event details...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !event) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch event details';
    return (
      <ProtectedRoute requireAdmin>
        <div className="min-h-screen">
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
                    d="M12 9v2m0 4h.01mande-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Error Loading Event</h1>
              <p className="text-muted text-lg mb-6 max-w-md mx-auto">{errorMessage}</p>
              <Link
                href="/admin/events"
                className="px-6 py-3 text-white font-semibold rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: '#4682B4' }}
              >
                Back to Events
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!event) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-high rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Event Not Found</h1>
              <p className="text-muted text-lg mb-6 max-w-md mx-auto">
                The event you're looking for doesn't exist or has been removed.
              </p>
              <Link
                href="/admin/events"
                className="px-6 py-3 text-white font-semibold rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: '#4682B4' }}
              >
                Back to Events
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Link href="/admin/events" className="text-muted hover:text-text-secondary text-sm">
                Events
              </Link>
              <span className="text-muted">/</span>
              <Link
                href={`/admin/events/${eventId}`}
                className="text-muted hover:text-text-secondary text-sm"
              >
                {event.name}
              </Link>
              <span className="text-muted">/</span>
              <span className="text-text-primary text-sm font-medium">Edit Brief</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Edit Event Brief</h1>
            <p className="text-muted">Customize the brief content that competitors will see</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-900/30 border border-green-700/50 rounded-lg p-4">
              <p className="text-green-400">{success}</p>
            </div>
          )}

          {saveMutation.error && (
            <div className="mb-6 bg-red-900/30 border border-red-700/50 rounded-lg p-4">
              <p className="text-red-400">
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : 'Failed to update brief'}
              </p>
            </div>
          )}

          {/* Event Info */}
          <div className="panel rounded-2xl  p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Event Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted mb-1">Event Name</h3>
                <p className="text-white font-medium">{event.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted mb-1">Event Code</h3>
                <p className="text-white font-mono">{event.code}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted mb-1">Status</h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  {event.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted mb-1">Type</h3>
                <p className="text-white">
                  {event.isTeamEvent ? 'Team Event' : 'Individual Event'}
                </p>
              </div>
            </div>
          </div>

          {/* Brief Editor */}
          <div className="panel rounded-2xl  p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Brief Content</h2>
              <button
                onClick={handlePreview}
                className="px-4 py-2 bg-surface-high text-text-secondary rounded-lg hover:bg-surface-high transition-colors"
              >
                Preview Brief
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="brief" className="block text-sm font-medium text-text-secondary mb-2">
                Brief Content (Markdown supported)
              </label>
              <textarea
                id="brief"
                value={resolvedBrief}
                onChange={(e) => setBrief(e.target.value)}
                rows={20}
                className="block w-full px-4 py-3 bg-surface-high border border-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                placeholder={`# ${event.name} - Event Brief

## Event Overview
This is a [team/individual] competition that will test your strength and endurance.

## Competition Format
- **Event Type**: [Team/Individual] competition
- **Scoring System**: Age, sex, and bodyweight-adjusted formulas
- **Real-time Updates**: Live leaderboard updates

## Rules and Guidelines

### General Rules
- All lifts must be performed with proper form and technique
- Competitors must provide accurate bodyweight measurements
- Age and sex information must be accurate for fair scoring
- All attempts must be witnessed by an event official
- Appropriate safety equipment is required

### Equipment Requirements
- Weightlifting shoes or flat-soled shoes
- Comfortable, non-restrictive clothing
- Belt (optional but recommended for heavy lifts)
- Chalk for grip (if needed)

### Safety Guidelines
- Warm up properly before attempting maximum lifts
- Use spotters when appropriate
- Listen to your body and don't attempt lifts beyond your capability
- Stay hydrated throughout the competition

## How to Participate

1. **Join the Event**: Use the event code \`${event.code}\` to join this competition
2. **Complete Your Profile**: Ensure your profile includes accurate age, sex, and bodyweight information
3. **Perform Your Lifts**: Complete your lifts during the event period
4. **Track Your Progress**: Monitor your scores and ranking on the live leaderboard

## Questions or Concerns?
Contact the event organizers if you have any questions about the event format, rules, or technical issues.`}
              />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-orange-800 mb-2 font-sans">Markdown Tips</h3>
              <ul className="text-sm text-orange-700 space-y-1 font-sans">
                <li>
                  • Use <code className="bg-orange-100 px-1 rounded"># ## ###</code> for headings
                </li>
                <li>
                  • Use <code className="bg-orange-100 px-1 rounded">**bold**</code> and{' '}
                  <code className="bg-orange-100 px-1 rounded">*italic*</code> for emphasis
                </li>
                <li>
                  • Use <code className="bg-orange-100 px-1 rounded">- item</code> for bullet lists
                </li>
                <li>
                  • Use <code className="bg-orange-100 px-1 rounded">`code`</code> for inline code
                </li>
                <li>
                  • Use <code className="bg-orange-100 px-1 rounded">[link text](url)</code> for
                  links
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-orange-600 transition-colors"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Brief'}
            </button>
            <Link
              href={`/admin/events/${eventId}`}
              className="px-6 py-3 bg-surface-high text-text-secondary rounded-lg hover:bg-surface-high transition-colors text-center"
            >
              Cancel
            </Link>
            <Link
              href={`/events/${eventId}/brief`}
              target="_blank"
              className="px-6 py-3 text-white rounded-lg transition-colors hover:opacity-90 text-center"
              style={{ backgroundColor: '#4682B4' }}
            >
              View Public Brief
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
