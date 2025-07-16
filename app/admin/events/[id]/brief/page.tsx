'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';

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
  const [event, setEvent] = useState<Event | null>(null);
  const [brief, setBrief] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const eventId = params.id as string;

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventData = await api.get(`/api/events/${eventId}`);
        setEvent(eventData);
        setBrief(eventData.brief || '');
      } catch (error: unknown) {
        console.error('Error fetching event details:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch event details';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/api/events/${eventId}`, {
        brief: brief,
      });
      setSuccess('Brief updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: unknown) {
      console.error('Error updating brief:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update brief';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    // Open the brief page in a new tab for preview
    window.open(`/events/${eventId}/brief`, '_blank');
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="px-4 sm:px-6 lg:px-8 py-6 bg-white dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400 font-sans">
                Loading event details...
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !event) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="px-4 sm:px-6 lg:px-8 py-6 bg-white dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-8">
              <p className="text-accent-600 dark:text-accent-400 font-sans">{error}</p>
              <Link
                href="/admin/events"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 transition-colors font-display font-bold"
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
        <div className="px-4 sm:px-6 lg:px-8 py-6 bg-white dark:bg-black">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 font-sans">Event not found.</p>
              <Link
                href="/admin/events"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 transition-colors font-display font-bold"
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
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Link
                href="/admin/events"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-sans"
              >
                Events
              </Link>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <Link
                href={`/admin/events/${eventId}`}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-sans"
              >
                {event.name}
              </Link>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <span className="text-gray-900 dark:text-white text-sm font-medium font-sans">
                Edit Brief
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 font-sans">
              Edit Event Brief
            </h1>
            <p className="text-gray-600 dark:text-gray-400 font-sans">
              Customize the brief content that competitors will see
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-4">
              <p className="text-green-800 dark:text-green-200 font-sans">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md p-4">
              <p className="text-orange-800 dark:text-orange-200 font-sans">{error}</p>
            </div>
          )}

          {/* Event Info */}
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 font-sans">
              Event Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 font-sans">
                  Event Name
                </h3>
                <p className="text-gray-900 dark:text-white font-medium font-sans">{event.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 font-sans">
                  Event Code
                </h3>
                <p className="text-gray-900 dark:text-white font-mono">{event.code}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 font-sans">
                  Status
                </h3>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-sans">
                  {event.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 font-sans">
                  Type
                </h3>
                <p className="text-gray-900 dark:text-white font-sans">
                  {event.isTeamEvent ? 'Team Event' : 'Individual Event'}
                </p>
              </div>
            </div>
          </div>

          {/* Brief Editor */}
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-sans">
                Brief Content
              </h2>
              <button onClick={handlePreview} className="btn-secondary">
                Preview Brief
              </button>
            </div>

            <div className="mb-4">
              <label
                htmlFor="brief"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-sans"
              >
                Brief Content (Markdown supported)
              </label>
              <textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={20}
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono text-sm transition-colors"
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

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2 font-sans">
                Markdown Tips
              </h3>
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 font-sans">
                <li>
                  • Use{' '}
                  <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded"># ## ###</code>{' '}
                  for headings
                </li>
                <li>
                  • Use{' '}
                  <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">**bold**</code>{' '}
                  and{' '}
                  <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">*italic*</code>{' '}
                  for emphasis
                </li>
                <li>
                  • Use{' '}
                  <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">- item</code> for
                  bullet lists
                </li>
                <li>
                  • Use{' '}
                  <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">`code`</code> for
                  inline code
                </li>
                <li>
                  • Use{' '}
                  <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">
                    [link text](url)
                  </code>{' '}
                  for links
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={handleSave} disabled={isSaving} className="btn-primary">
              {isSaving ? 'Saving...' : 'Save Brief'}
            </button>
            <Link href={`/admin/events/${eventId}`} className="btn-secondary">
              Cancel
            </Link>
            <Link href={`/events/${eventId}/brief`} target="_blank" className="btn-secondary">
              View Public Brief
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
