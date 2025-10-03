'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NotificationBell } from '@/components/ui/NotificationBell';

export function Header() {
  const { user, loading, signIn, signOut, signInAsGuest } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  if (loading) {
    return (
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white/80">
                Expense Tracker
              </h1>
            </div>
            <LoadingSpinner size="sm" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white/80">
              Expense Tracker
            </h1>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            {/* Notifications */}
            <NotificationBell />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="cursor-pointer p-1.5 sm:p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-xs text-gray-700 dark:text-gray-300 hidden lg:inline truncate max-w-[100px]">
                  {user.isGuest ? 'Guest' : user.displayName || user.email}
                </span>
                <button
                  onClick={signOut}
                  className="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <button
                  onClick={signInAsGuest}
                  className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-900 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs font-medium transition-colors dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 hidden sm:inline whitespace-nowrap"
                >
                  Guest
                </button>
                <button
                  onClick={signIn}
                  className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}