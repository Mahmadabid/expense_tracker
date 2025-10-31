import React from 'react';

export interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
}

export function StatsCard({ title, value, icon, color = 'blue', loading = false }: StatsCardProps) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <div>
            {icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5 sm:mb-1 truncate">{title}</p>
          {loading ? (
            <div className="h-4 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 sm:w-20 animate-pulse" />
          ) : (
            <p className="text-xs sm:text-base font-semibold text-gray-900 dark:text-white truncate">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}
