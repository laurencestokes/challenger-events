'use client';

import { useState } from 'react';
import { api } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import { FiX, FiUsers } from 'react-icons/fi';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTeamModal({ isOpen, onClose, onSuccess }: CreateTeamModalProps) {
  const { user } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [scope, setScope] = useState<'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY'>(
    'INVITE_ONLY',
  );
  const [organizationId, setOrganizationId] = useState('');
  const [gymId, setGymId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const teamData: {
        name: string;
        description?: string;
        scope: string;
        organizationId?: string;
        gymId?: string;
      } = {
        name: teamName.trim(),
        description: teamDescription.trim() || undefined,
        scope,
      };

      if (scope === 'ORGANIZATION' && organizationId) {
        teamData.organizationId = organizationId;
      }
      if (scope === 'GYM' && gymId) {
        teamData.gymId = gymId;
      }

      const response = await api.post('/api/teams', teamData);

      if (response.team) {
        onSuccess();
        setTeamName('');
        setTeamDescription('');
        setScope('INVITE_ONLY');
        setOrganizationId('');
        setGymId('');
        onClose();
      }
    } catch (error: { message: string } | unknown) {
      setError((error as { message: string }).message || 'Failed to create team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTeamName('');
    setTeamDescription('');
    setScope('INVITE_ONLY');
    setOrganizationId('');
    setGymId('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-white text-xl font-bold">Create Team</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="teamName" className="block text-sm font-medium text-gray-300 mb-2">
              Team Name *
            </label>
            <input
              type="text"
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter team name"
            />
          </div>

          <div>
            <label
              htmlFor="teamDescription"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Description (Optional)
            </label>
            <textarea
              id="teamDescription"
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Enter team description"
            />
          </div>

          {/* Team Scope Settings */}
          {isAdmin && (
            <div className="border-t border-gray-700/50 pt-4">
              <label htmlFor="scope" className="block text-sm font-medium text-gray-300 mb-2">
                Team Scope
              </label>
              <select
                id="scope"
                value={scope}
                onChange={(e) =>
                  setScope(e.target.value as 'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY')
                }
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="INVITE_ONLY">Invite Only - Only invited members</option>
                <option value="PUBLIC">Public - Anyone can join</option>
                <option value="ORGANIZATION">Organization - Specific organization members</option>
                <option value="GYM">Gym - Specific gym members</option>
              </select>

              {scope === 'ORGANIZATION' && (
                <div className="mt-3">
                  <label
                    htmlFor="organizationId"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Organization ID
                  </label>
                  <input
                    type="text"
                    id="organizationId"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter organization ID"
                  />
                </div>
              )}

              {scope === 'GYM' && (
                <div className="mt-3">
                  <label htmlFor="gymId" className="block text-sm font-medium text-gray-300 mb-2">
                    Gym ID
                  </label>
                  <input
                    type="text"
                    id="gymId"
                    value={gymId}
                    onChange={(e) => setGymId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter gym ID"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FiUsers className="w-4 h-4" />
                  <span>Create Team</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
