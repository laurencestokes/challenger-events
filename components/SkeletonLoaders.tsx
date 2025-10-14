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
