'use client';

import { useState } from 'react';
import { api } from '../lib/api-client';
import { FiX, FiUsers } from 'react-icons/fi';

interface JoinTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinTeamModal({ isOpen, onClose, onSuccess }: JoinTeamModalProps) {
  const [teamCode, setTeamCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamCode.trim()) {
      setError('Please enter a team code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/teams/join-by-code', {
        teamCode: teamCode.trim().toUpperCase(),
      });

      if (response.message) {
        onSuccess();
        setTeamCode('');
        onClose();
      }
    } catch (error: { message: string } | unknown) {
      setError((error as { message: string }).message || 'Failed to join team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTeamCode('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-white text-xl font-bold">Join Team by Code</h2>
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
            <label htmlFor="teamCode" className="block text-sm font-medium text-gray-300 mb-2">
              Team Code *
            </label>
            <input
              type="text"
              id="teamCode"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter team code"
            />
            <p className="text-xs text-gray-400 mt-1">
              Ask your team captain for the invitation code
            </p>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-700/50 rounded-lg p-3">
              {error}
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
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Joining...' : 'Join Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
