'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  userRole?: 'CAPTAIN' | 'MEMBER' | null;
  isMember?: boolean;
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showJoinByCodeModal, setShowJoinByCodeModal] = useState(false);
  const [joinTeamId, setJoinTeamId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);

  // Form state for creating team
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/teams/all');
      setUserTeams(response.userTeams || []);
      setTeams(response.availableTeams || []);
    } catch (error: unknown) {
      console.error('Error fetching teams:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch teams';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    try {
      const response = await api.post('/api/teams', {
        name: teamName.trim(),
        description: teamDescription.trim(),
      });

      setShowCreateModal(false);
      setTeamName('');
      setTeamDescription('');

      // Redirect to the new team's detail page
      router.push(`/teams/${response.team.id}`);
    } catch (error: unknown) {
      console.error('Error creating team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team';
      setError(errorMessage);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinTeamId) return;

    try {
      await api.post('/api/teams/join', {
        teamId: joinTeamId,
      });

      setShowJoinModal(false);
      setJoinTeamId('');
      fetchTeams();
    } catch (error: unknown) {
      console.error('Error joining team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join team';
      setError(errorMessage);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      setIsJoiningByCode(true);
      await api.post('/api/teams/join-by-code', {
        code: joinCode.trim(),
      });

      setShowJoinByCodeModal(false);
      setJoinCode('');
      fetchTeams();
    } catch (error: unknown) {
      console.error('Error joining team by code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join team';
      setError(errorMessage);
    } finally {
      setIsJoiningByCode(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* User's Teams */}
      {userTeams.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Teams</h3>
          <div className="space-y-3">
            {userTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => router.push(`/teams/${team.id}`)}
              >
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{team.name}</h4>
                  {team.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      team.userRole === 'CAPTAIN'
                        ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {team.userRole === 'CAPTAIN' ? 'Captain' : 'Member'}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Teams */}
      <div className="bg-white dark:bg-gray-800 shadow-challenger rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Teams</h3>
          <div className="space-x-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
            >
              Join Team
            </button>
            <button
              onClick={() => setShowJoinByCodeModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Join by Code
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Create Team
            </button>
          </div>
        </div>

        {teams.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            {userTeams.length === 0
              ? 'No teams available. Create the first team!'
              : 'No teams available to join.'}
          </p>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => router.push(`/teams/${team.id}`)}
              >
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{team.name}</h4>
                  {team.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setJoinTeamId(team.id);
                      setShowJoinModal(true);
                    }}
                    className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    Join
                  </button>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Create New Team
              </h3>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label
                    htmlFor="teamName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Team Name *
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                    placeholder="Enter team name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="teamDescription"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Description
                  </label>
                  <textarea
                    id="teamDescription"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                    placeholder="Optional team description"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                  >
                    Create Team
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Join Team</h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="teamSelect"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Select Team
                  </label>
                  <select
                    id="teamSelect"
                    value={joinTeamId}
                    onChange={(e) => setJoinTeamId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                  >
                    <option value="">Choose a team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinTeam}
                    disabled={!joinTeamId}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                  >
                    Join Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoinByCodeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Join Team by Code
              </h3>
              <form onSubmit={handleJoinByCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="joinCode"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Invitation Code *
                  </label>
                  <input
                    type="text"
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700"
                    placeholder="Enter invitation code"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinByCodeModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isJoiningByCode}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                  >
                    {isJoiningByCode ? 'Joining...' : 'Join Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
