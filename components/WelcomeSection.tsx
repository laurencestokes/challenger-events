'use client';

import { useAuth } from '../contexts/AuthContext';

interface WelcomeSectionProps {
  showMetrics?: boolean;
  totalEvents?: number;
  activeEvents?: number;
  totalUsers?: number;
  activeUsers?: number;
  verifiedScore?: number;
  totalScore?: number;
  isLoading?: boolean;
}

export default function WelcomeSection({
  showMetrics = false,
  totalEvents = 0,
  activeEvents = 0,
  totalUsers = 0,
  activeUsers = 0,
  verifiedScore,
  totalScore,
  isLoading = false,
}: WelcomeSectionProps) {
  const { user } = useAuth();

  // Lightweight tooltip for info hovers (local-only)
  const Info = ({ text }: { text: string }) => (
    <span className="relative inline-block group align-middle ml-2">
      <span
        aria-label="info"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] leading-none border border-gray-500 text-gray-300"
      >
        i
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-72 rounded-md border border-gray-600/30 bg-black/90 px-3 py-2 text-xs text-white shadow-xl z-[1000] group-hover:block">
        {text}
      </span>
    </span>
  );

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mr-4"
          style={{
            backgroundColor: user?.role === 'ADMIN' ? '#4682B4' : '#6B7280',
          }}
        >
          <span className="text-white text-xl font-bold">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <p className="text-gray-400 text-sm">Welcome Back</p>
            {user?.role === 'ADMIN' && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                ADMIN
              </span>
            )}
          </div>
          <h1 className="text-white text-2xl font-bold">{user?.name || user?.email}</h1>
        </div>
      </div>

      {showMetrics && (
        <div className="text-right space-y-3">
          {/* Total Events/Users / Verified Score */}
          <div className="flex flex-col items-end">
            <p className="text-white font-medium text-base mb-1 flex items-center">
              {user?.role === 'ADMIN' ? (
                totalUsers > 0 ? (
                  'Total Users'
                ) : (
                  'Total Events'
                )
              ) : (
                <>
                  Verified Score
                  <Info
                    text={
                      'Average of your best verified scores across our canonical events (verified via official events or admin verification).'
                    }
                  />
                </>
              )}
            </p>
            {isLoading ? (
              <div
                className={`px-3 py-2 rounded-lg w-20 ${user?.role === 'ADMIN' ? '' : 'bg-green-900/30 border border-green-700/50'}`}
                style={{
                  backgroundColor: user?.role === 'ADMIN' ? '#4682B4' : undefined,
                  opacity: user?.role === 'ADMIN' ? 0.3 : undefined,
                }}
              >
                <div
                  className="h-6 rounded animate-pulse"
                  style={{ backgroundColor: '#D9D9D9' }}
                ></div>
              </div>
            ) : (
              <div
                className={`px-3 py-2 rounded-lg w-20 ${user?.role === 'ADMIN' ? '' : 'bg-green-900/30 border border-green-700/50'}`}
                style={{
                  backgroundColor: user?.role === 'ADMIN' ? '#4682B4' : undefined,
                }}
              >
                <span
                  className={`font-bold ${user?.role === 'ADMIN' ? 'text-white' : 'text-green-400'}`}
                >
                  {user?.role === 'ADMIN'
                    ? totalUsers > 0
                      ? totalUsers
                      : totalEvents
                    : verifiedScore || 0}
                </span>
              </div>
            )}
          </div>

          {/* Active Events/Users / Total Score */}
          <div className="flex flex-col items-end">
            <p className="text-white font-medium text-base mb-1 flex items-center">
              {user?.role === 'ADMIN' ? (
                activeUsers > 0 ? (
                  'Active Users'
                ) : (
                  'Active Events'
                )
              ) : (
                <>
                  Total Score
                  <Info
                    text={
                      'Average of your best scores (verified or unverified) across our canonical events during the beta; we continuously review and expand this set.'
                    }
                  />
                </>
              )}
            </p>
            {isLoading ? (
              <div
                className="px-3 py-2 rounded-lg w-20"
                style={{
                  background:
                    user?.role === 'ADMIN'
                      ? 'linear-gradient(90deg, #E84C04 0%, #D93D00 50%, #B83200 100%)'
                      : 'linear-gradient(90deg, #E5965E 0%, #F26004 35.58%, #C10901 67.79%, #240100 100%)',
                  opacity: 0.3,
                }}
              >
                <div
                  className="h-6 rounded animate-pulse"
                  style={{ backgroundColor: '#FFFFFF', opacity: 0.2 }}
                ></div>
              </div>
            ) : (
              <div
                className="px-3 py-2 rounded-lg w-20"
                style={{
                  background:
                    user?.role === 'ADMIN'
                      ? 'linear-gradient(90deg, #E84C04 0%, #D93D00 50%, #B83200 100%)'
                      : 'linear-gradient(90deg, #E5965E 0%, #F26004 35.58%, #C10901 67.79%, #240100 100%)',
                }}
              >
                <span className="text-white font-bold">
                  {user?.role === 'ADMIN'
                    ? activeUsers > 0
                      ? activeUsers
                      : activeEvents
                    : totalScore || 0}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
