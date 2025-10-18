'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

interface TeamManagementProps {
  eventId?: string;
  onTeamJoined?: (teamId: string) => void;
}

export default function TeamManagement({ eventId, onTeamJoined }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating team
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const teamsData = await api.get('/api/teams');
      setTeams(teamsData.teams || []);
    } catch (error: unknown) {
      console.error('Error fetching teams:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch teams';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentTeamSelection = useCallback(async () => {
    if (!eventId) return;

    try {
      // Get user's participation details for this event
      const participationResponse = await api.get(`/api/events/${eventId}/debug-participation`);
      if (participationResponse.participation?.teamId) {
        setSelectedTeamId(participationResponse.participation.teamId);
      }
    } catch (error: unknown) {
      console.error('Error fetching current team selection:', error);
      // Don't show error to user, just log it
    }
  }, [eventId]);

  useEffect(() => {
    fetchTeams();
    if (eventId) {
      fetchCurrentTeamSelection();
    }
  }, [eventId, fetchTeams, fetchCurrentTeamSelection]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    try {
      // Create the team
      const teamResponse = await api.post('/api/teams', {
        name: teamName.trim(),
        description: teamDescription.trim(),
      });

      // Join the team for this event
      await api.post(`/api/events/${eventId}/join-team`, {
        teamId: teamResponse.team.id,
      });

      setShowCreateModal(false);
      setTeamName('');
      setTeamDescription('');
      fetchTeams();
      onTeamJoined?.(teamResponse.team.id);
    } catch (error: unknown) {
      console.error('Error creating team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team';
      setError(errorMessage);
    }
  };

  const handleSelectTeam = async (teamId: string) => {
    if (!eventId) return;

    try {
      setSelectedTeamId(teamId);

      // Update participation to select this team for the event
      await api.post(`/api/events/${eventId}/join-team`, {
        teamId: teamId,
      });

      // Refresh teams to show updated state
      fetchTeams();
      onTeamJoined?.(teamId);
    } catch (error: unknown) {
      console.error('Error selecting team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to select team';
      setError(errorMessage);
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

      {/* Team Selection for Event */}
      {eventId && (
        <>
          <h3 className="text-lg font-semibold text-white mb-4">
            Select Your Team for This Event
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Choose a team to compete with in this event. You can only be on one team per event.
          </p>

          {teams.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-4">
                No teams available for this event.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
              >
                Create First Team
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => {
                const isSelected = selectedTeamId === team.id;
                return (
                  <div
                    key={team.id}
                    className={`relative flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${isSelected
                        ? 'border-primary-500 bg-primary-900/20 shadow-md'
                        : 'border-gray-600 hover:border-primary-400 hover:shadow-sm'
                      }`}
                    onClick={() => handleSelectTeam(team.id)}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      <div
                        className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${isSelected
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-gray-300 dark:border-gray-600'
                          }`}
                      >
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-white">
                            {team.name}
                          </h4>
                        </div>
                        {team.description && (
                          <p className="text-sm text-gray-400 mt-1">
                            {team.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side indicator */}
                    <div className="flex items-center space-x-2">
                      {isSelected ? (
                        <div className="flex items-center space-x-1 text-primary-600 dark:text-primary-400">
                          <span className="text-sm font-medium">Your Team</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTeam(team.id);
                          }}
                          className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selection summary */}
          {selectedTeamId && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium text-green-200">
                  You're competing with:{' '}
                  <span className="font-semibold">
                    {teams.find((t) => t.id === selectedTeamId)?.name}
                  </span>
                </span>
              </div>
            </div>
          )}
        </>
      )}

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
    </div>
  );
}
