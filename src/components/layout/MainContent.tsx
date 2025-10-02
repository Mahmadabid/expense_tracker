'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function MainContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Expense Tracker
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Track your expenses, income, and loans with collaborative features.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Get Started
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Sign in with Google to sync your data across devices, or continue as a guest to try it out.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>✓ Track income, expenses, and loans</p>
              <p>✓ Collaborate with others on shared expenses</p>
              <p>✓ Export data to CSV</p>
              <p>✓ Dark mode support</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {user.isGuest ? 'Guest Dashboard' : `Welcome back, ${user.displayName || 'User'}!`}
        </h2>
        {user.isGuest && (
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              You&apos;re using a guest account. Your data is stored locally and may be lost. 
              <button className="font-medium underline ml-1">Sign in to save your data permanently</button>.
            </p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Total Income</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">$0.00</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">$0.00</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Outstanding Loans</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">$0.00</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md font-medium transition-colors">
            Add Income
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md font-medium transition-colors">
            Add Expense
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium transition-colors">
            Add Loan
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No entries yet. Add your first income, expense, or loan to get started!</p>
        </div>
      </div>
    </div>
  );
}