import React, { useState } from 'react';
import { getAuthHeader } from '@/lib/firebase/auth';

interface TransactionCardProps {
  entry: any;
  onUpdate: () => void;
  addToast: any;
}

export function TransactionCard({ entry, onUpdate, addToast }: TransactionCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this transaction?')) return;
    setDeleting(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/entries/${entry._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        onUpdate();
      } else {
        addToast({ type: 'error', title: 'Failed to delete', description: 'Could not delete the transaction. Please try again.' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error occurred', description: 'An unexpected error occurred while deleting.' });
    } finally {
      setDeleting(false);
    }
  };

  const isIncome = entry.type === 'income';

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 relative">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${isIncome ? 'bg-green-500' : 'bg-red-500'}`} />

      <div className="flex items-center gap-2 sm:gap-3 pl-2">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${isIncome
          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
          {isIncome ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1 sm:mb-1.5">
            <h4 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
              {entry.description || entry.category || 'Transaction'}
            </h4>
            <span className={`text-sm sm:text-base font-bold whitespace-nowrap ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
              {isIncome ? '+' : '-'}{entry.currency || 'PKR'} {entry.amount?.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            {entry.category && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-medium">
                {entry.category}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="sm:hidden">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="cursor-pointer p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 sm:top-10 z-20 min-w-[120px] sm:min-w-[140px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="cursor-pointer w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
