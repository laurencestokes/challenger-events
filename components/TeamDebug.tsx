'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';

interface TeamDebugProps {
  eventId: string;
}

interface DebugData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  event: {
    id: string;
    name: string;
    isTeamEvent: boolean;
  };
  participation: {
    id: string;
    userId: string;
    eventId: string;
    teamId?: string;
    joinedAt: unknown;
  } | null;
  userTeams: Array<{
    id: string;
    name: string;
    description?: string;
    members: Array<{
      userId: string;
      role: string;
    }>;
  }>;
}

export default function TeamDebug({ eventId }: TeamDebugProps) {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const checkParticipation = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const data = await api.get(`/api/events/${eventId}/debug-participation`);
      setDebugData(data);
      setMessageType('success');
      setMessage('Debug data loaded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load debug data';
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const fixTeamParticipation = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const data = await api.post(`/api/events/${eventId}/fix-team-participation`, {});
      setMessageType('success');
      setMessage(data.message);
      // Refresh debug data
      await checkParticipation();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fix team participation';
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-4">
        Team Participation Debug
      </h3>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <button
            onClick={checkParticipation}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Check Participation'}
          </button>
          <button
            onClick={fixTeamParticipation}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Fixing...' : 'Fix Team Participation'}
          </button>
        </div>

        {message && (
          <div
            className={`text-sm ${messageType === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {message}
          </div>
        )}

        {debugData && (
          <div className="text-sm space-y-2">
            <div>
              <strong>User:</strong> {debugData.user.name} ({debugData.user.email})
            </div>
            <div>
              <strong>Event:</strong> {debugData.event.name} (Team Event:{' '}
              {debugData.event.isTeamEvent ? 'Yes' : 'No'})
            </div>
            <div>
              <strong>Participation:</strong>{' '}
              {debugData.participation ? (
                <>
                  ✓ Participating
                  {debugData.participation.teamId
                    ? ` (Team ID: ${debugData.participation.teamId})`
                    : ' (No team assigned)'}
                </>
              ) : (
                '✗ Not participating'
              )}
            </div>
            <div>
              <strong>User Teams:</strong>{' '}
              {debugData.userTeams.length > 0 ? (
                <ul className="ml-4">
                  {debugData.userTeams.map((team) => (
                    <li key={team.id}>
                      {team.name} ({team.members.length} members)
                    </li>
                  ))}
                </ul>
              ) : (
                'No teams'
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
