'use client';

// Event Card Skeleton
export function EventCardSkeleton() {
  return (
    <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 animate-pulse">
      <div className="p-4 h-full flex flex-col justify-between">
        <div>
          <div className="h-4 bg-gray-700 rounded mb-2 w-3/4"></div>
          <div className="h-3 bg-gray-700 rounded mb-2 w-1/2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/3"></div>
        </div>
        <div className="h-8 bg-gray-700 rounded w-full"></div>
      </div>
    </div>
  );
}

// Team Card Skeleton
export function TeamCardSkeleton() {
  return (
    <div className="w-64 h-48 bg-gray-800 rounded-lg flex-shrink-0 animate-pulse">
      <div className="p-4 h-full flex flex-col justify-between">
        <div>
          <div className="h-4 bg-gray-700 rounded mb-1 w-3/4"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="h-3 bg-gray-700 rounded w-1/3"></div>
      </div>
    </div>
  );
}

// Large Event Card Skeleton
export function LargeEventCardSkeleton() {
  return (
    <div className="w-full h-80 bg-gray-800 rounded-2xl relative overflow-hidden animate-pulse">
      {/* Background skeleton */}
      <div className="absolute inset-0 bg-gray-700"></div>

      {/* Title overlay skeleton */}
      <div className="absolute top-6 left-6 right-6 z-10">
        <div className="h-8 bg-gray-600 rounded mb-2 w-2/3"></div>
        <div className="h-4 bg-gray-600 rounded mb-1 w-full"></div>
        <div className="h-4 bg-gray-600 rounded w-3/4"></div>
      </div>

      {/* Footer skeleton */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-600 p-6">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-gray-500 rounded"></div>
            <div className="h-4 bg-gray-500 rounded w-32"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-gray-500 rounded"></div>
            <div className="h-4 bg-gray-500 rounded w-24"></div>
          </div>
          <div className="flex items-center space-x-3 mt-3">
            <div className="h-6 bg-gray-500 rounded w-16"></div>
            <div className="h-4 bg-gray-500 rounded w-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Team Management Skeleton
export function TeamManagementSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
      <div className="space-y-6">
        {/* Description skeleton */}
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>

        {/* Team selection skeleton */}
        <div>
          <div className="h-6 bg-gray-700 rounded mb-4 w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded mb-4 w-3/4"></div>

          {/* Team cards skeleton */}
          <div className="space-y-3">
            <div className="p-4 border-2 border-gray-600 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded mb-2 w-1/3"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-700 rounded w-16"></div>
              </div>
            </div>
            <div className="p-4 border-2 border-gray-600 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded mb-2 w-1/3"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Actions Skeleton
export function QuickActionsSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
      <div className="space-y-3">
        <div className="h-8 bg-gray-700 rounded w-full"></div>
        <div className="h-8 bg-gray-700 rounded w-full"></div>
        <div className="h-8 bg-gray-700 rounded w-full"></div>
        <div className="h-8 bg-gray-700 rounded w-full"></div>
        <div className="h-8 bg-gray-700 rounded w-full"></div>
      </div>
    </div>
  );
}

// Event Stats Skeleton
export function EventStatsSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
      <div className="space-y-3">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-700 rounded w-20"></div>
          <div className="h-4 bg-gray-700 rounded w-8"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-gray-700 rounded w-16"></div>
          <div className="h-6 bg-gray-700 rounded w-16"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-gray-700 rounded w-20"></div>
          <div className="h-4 bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}

// Performance Graph Skeleton
export function PerformanceGraphSkeleton() {
  return (
    <div className="w-full h-[400px] bg-gray-800/50 rounded-xl p-4 animate-pulse">
      <div className="space-y-4">
        {/* Controls skeleton */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <div className="h-8 bg-gray-700 rounded-lg w-32"></div>
            <div className="h-8 bg-gray-700 rounded-lg w-24"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-700 rounded-lg w-16"></div>
            <div className="h-8 bg-gray-700 rounded-lg w-20"></div>
            <div className="h-8 bg-gray-700 rounded-lg w-20"></div>
            <div className="h-8 bg-gray-700 rounded-lg w-16"></div>
          </div>
        </div>

        {/* Legend skeleton */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-700 rounded-full"></div>
            <div className="h-4 bg-gray-700 rounded w-20"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-700 rounded-full"></div>
            <div className="h-4 bg-gray-700 rounded w-24"></div>
          </div>
        </div>

        {/* Chart area skeleton */}
        <div className="w-full h-[300px] bg-gray-700/50 rounded-lg flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading performance data...</div>
        </div>
      </div>
    </div>
  );
}

// Profile Information Skeleton
export function ProfileInfoSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div>
            <div className="h-3 bg-gray-700 rounded w-1/6 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/3"></div>
          </div>
          <div>
            <div className="h-3 bg-gray-700 rounded w-1/6 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
          <div>
            <div className="h-3 bg-gray-700 rounded w-1/6 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          </div>
          <div>
            <div className="h-3 bg-gray-700 rounded w-1/6 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/5"></div>
          </div>
          <div>
            <div className="h-3 bg-gray-700 rounded w-1/6 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Verification Status Skeleton
export function VerificationStatusSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div>
            <div className="h-3 bg-gray-700 rounded w-1/4 mb-2"></div>
            <div className="h-6 bg-gray-700 rounded-full w-20"></div>
          </div>
          <div className="h-16 bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

// Scores List Skeleton
export function ScoresListSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="h-5 bg-gray-700 rounded w-16"></div>
                  <div className="h-5 bg-gray-700 rounded w-20"></div>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-700 rounded w-20"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-6 bg-gray-700 rounded w-12 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Team Header Skeleton
export function TeamHeaderSkeleton() {
  return (
    <div className="mb-8 animate-pulse">
      {/* Breadcrumbs Skeleton */}
      <div className="mb-6">
        <div className="h-4 bg-gray-700 rounded w-48"></div>
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="h-8 bg-gray-700 rounded w-64"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-8 bg-gray-700 rounded w-20"></div>
          <div className="h-8 bg-gray-700 rounded w-24"></div>
          <div className="h-8 bg-gray-700 rounded w-20"></div>
        </div>
      </div>

      {/* Description and Date Skeleton */}
      <div className="h-4 bg-gray-700 rounded w-96 mb-4"></div>
      <div className="h-3 bg-gray-700 rounded w-48"></div>
    </div>
  );
}

// Team Members List Skeleton
export function TeamMembersListSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-gray-700 rounded w-40"></div>
        <div className="h-8 bg-gray-700 rounded w-24"></div>
      </div>

      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 border border-gray-700/50 rounded-lg bg-gray-900/50"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-48 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-24"></div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-6 bg-gray-700 rounded w-16"></div>
              <div className="h-6 bg-gray-700 rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Event List Skeleton
export function EventListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-6 bg-gray-900/50 border border-gray-700/50 rounded-xl animate-pulse"
        >
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-5 bg-gray-700 rounded w-48"></div>
              <div className="h-6 bg-gray-700 rounded-full w-16"></div>
            </div>
            <div className="h-4 bg-gray-700 rounded w-72 mb-2"></div>
            <div className="flex items-center space-x-6">
              <div className="h-3 bg-gray-700 rounded w-32"></div>
              <div className="h-3 bg-gray-700 rounded w-24"></div>
              <div className="h-3 bg-gray-700 rounded w-24"></div>
              <div className="h-3 bg-gray-700 rounded w-28"></div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-6 bg-gray-700 rounded w-16"></div>
            <div className="h-6 bg-gray-700 rounded w-20"></div>
            <div className="h-8 bg-gray-700 rounded w-20"></div>
            <div className="h-6 bg-gray-700 rounded w-12"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
