'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@lib/api-client';

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
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinByCodeModal, setShowJoinByCodeModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);

  // Form state for creating team
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  useEffect(() => {
    fetchUserTeams();
  }, []);

  const fetchUserTeams = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/teams/user');
      setUserTeams(response.teams || []);
    } catch (error: unknown) {
      console.error('Error fetching user teams:', error);
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
      fetchUserTeams();
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-text-secondary">Loading teams...</p>
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
        <div className="bg-surface-low rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Your Teams</h3>
          <div className="space-y-3">
            {userTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-surface-high cursor-pointer"
                onClick={() => router.push(`/teams/${team.id}`)}
              >
                <div>
                  <h4 className="font-medium text-text-primary">{team.name}</h4>
                  {team.description && (
                    <p className="text-sm text-text-secondary">{team.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      team.userRole === 'CAPTAIN'
                        ? 'bg-primary/20 text-primary-light'
                        : 'text-muted'
                    }`}
                  >
                    {team.userRole === 'CAPTAIN' ? 'Captain' : 'Member'}
                  </span>
                  <svg
                    className="w-4 h-4 text-muted"
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

      {/* Team Actions */}
      <div className="bg-surface-low rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Team Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium text-text-primary mb-2">Join a Team</h4>
            <p className="text-sm text-text-secondary mb-4">
              Join an existing team using an invitation code provided by the team captain.
            </p>
            <button
              onClick={() => setShowJoinByCodeModal(true)}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light rounded-md"
            >
              Join by Code
            </button>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium text-text-primary mb-2">Create a Team</h4>
            <p className="text-sm text-text-secondary mb-4">
              Create a new team and become the team captain. You can then invite others to join.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-4 py-2 text-sm font-medium text-text-secondary bg-surface-high border border-border rounded-md hover:bg-surface-high"
            >
              Create Team
            </button>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="teams-create-title"
            className="relative top-20 mx-auto p-5 w-96 rounded-md panel"
          >
            <div className="mt-3">
              <h3 id="teams-create-title" className="text-lg font-medium text-text-primary mb-4">
                Create New Team
              </h3>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label
                    htmlFor="teamName"
                    className="block text-sm font-medium text-text-secondary"
                  >
                    Team Name *
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
                    placeholder="Enter team name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="teamDescription"
                    className="block text-sm font-medium text-text-secondary"
                  >
                    Description
                  </label>
                  <textarea
                    id="teamDescription"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
                    placeholder="Optional team description"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-high border border-border rounded-md hover:bg-surface-high"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light rounded-md"
                  >
                    Create Team
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoinByCodeModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-code-title"
            className="relative top-20 mx-auto p-5 w-96 rounded-md panel"
          >
            <div className="mt-3">
              <h3 id="join-code-title" className="text-lg font-medium text-text-primary mb-4">
                Join Team by Code
              </h3>
              <form onSubmit={handleJoinByCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="joinCode"
                    className="block text-sm font-medium text-text-secondary"
                  >
                    Invitation Code *
                  </label>
                  <input
                    type="text"
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-surface-high"
                    placeholder="Enter invitation code"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinByCodeModal(false)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-high border border-border rounded-md hover:bg-surface-high"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isJoiningByCode}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
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
