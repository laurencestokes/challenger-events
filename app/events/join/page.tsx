'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/lib/api-client';

export default function JoinEvent() {
  const [eventCode, setEventCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const data = await api.post('/api/events/join', {
        eventCode: eventCode.toUpperCase(),
      });

      setMessageType('success');
      setMessage(data.message);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error: unknown) {
      setMessageType('error');
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred. Please try again.';
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white font-sans">
              Join an Event
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400 font-sans">
              Enter the event code to participate
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="eventCode" className="sr-only">
                Event Code
              </label>
              <input
                id="eventCode"
                name="eventCode"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm text-center text-lg font-mono tracking-widest transition-colors"
                placeholder="ABC123"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !eventCode}
                className="btn-primary w-full"
              >
                {isLoading ? 'Joining...' : 'Join Event'}
              </button>
            </div>

            {message && (
              <div
                className={`text-sm text-center font-sans ${
                  messageType === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-accent-600 dark:text-accent-400'
                }`}
              >
                {message}
              </div>
            )}
          </form>

          <div className="text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-sans"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
