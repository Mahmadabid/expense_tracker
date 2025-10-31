import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 animate-pulse border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
