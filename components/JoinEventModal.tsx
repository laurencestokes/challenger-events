'use client';

import { useState } from 'react';
import { api } from '../lib/api-client';
import { FiX, FiCalendar, FiUsers } from 'react-icons/fi';

interface JoinEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinEventModal({ isOpen, onClose, onSuccess }: JoinEventModalProps) {
  const [eventCode, setEventCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventCode.trim()) {
      setError('Please enter an event code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/events/join', {
        eventCode: eventCode.trim().toUpperCase(),
      });

      if (response.message) {
        onSuccess();
        setEventCode('');
        onClose();
      }
    } catch (error: { message: string } | unknown) {
      setError((error as { message: string }).message || 'Failed to join event');
    } finally {
      setError((error as unknown as { message: string }).message || 'Failed to join event');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEventCode('');
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
              <FiCalendar className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-white text-xl font-bold">Join Event</h2>
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
            <label htmlFor="eventCode" className="block text-gray-300 text-sm font-medium mb-2">
              Event Code
            </label>
            <input
              type="text"
              id="eventCode"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value.toUpperCase())}
              placeholder="Enter event code (e.g., ABC123)"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              maxLength={10}
            />
            <p className="text-gray-400 text-xs mt-1">
              Ask your event organizer for the event code
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !eventCode.trim()}
              className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <FiUsers className="w-4 h-4" />
                  <span>Join Event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
