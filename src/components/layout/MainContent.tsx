'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    totalLoaned: number;
    totalBorrowed: number;
    netLoan: number;
  };
  recentEntries: any[];
  recentLoans: any[];
}

export function MainContent() {
  const { user, loading } = useAuth();
  const [modalType, setModalType] = useState<null | 'income' | 'expense' | 'loan'>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ amount: '', description: '', category: '' });

  const closeModal = () => {
    setModalType(null);
    setFormData({ amount: '', description: '', category: '' });
  };

  useEffect(() => {
    if (user && !user.isGuest) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      const token = localStorage.getItem('firebaseToken');
      const res = await fetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description || submitting) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('firebaseToken');
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: modalType,
          amount: parseFloat(formData.amount),
          currency: localStorage.getItem('currency') || 'PKR',
          description: formData.description,
          category: formData.category || undefined,
          date: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        closeModal();
        fetchDashboardData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to create entry:', err);
    } finally {
      setSubmitting(false);
    }
  };

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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white/80 mb-4">
            Welcome to Expense Tracker
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Track your expenses, income, and loans with collaborative features.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white/80 mb-4">
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white/80">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 dark:text-white/80 mb-1 sm:mb-2">Total Income</h3>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
            {dataLoading ? '...' : `${localStorage.getItem('currency') || 'PKR'} ${dashboardData?.summary.totalIncome.toFixed(2) || '0.00'}`}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 dark:text-white/80 mb-1 sm:mb-2">Total Expenses</h3>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
            {dataLoading ? '...' : `${localStorage.getItem('currency') || 'PKR'} ${dashboardData?.summary.totalExpense.toFixed(2) || '0.00'}`}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 dark:text-white/80 mb-1 sm:mb-2">Net Balance</h3>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
            {dataLoading ? '...' : `${localStorage.getItem('currency') || 'PKR'} ${dashboardData?.summary.balance.toFixed(2) || '0.00'}`}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white/80 mb-3 sm:mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
          <button onClick={() => setModalType('income')} className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-2 py-2 sm:px-4 sm:py-3 rounded-md text-xs sm:text-sm md:text-base font-medium transition-colors">
            Add Income
          </button>
          <button onClick={() => setModalType('expense')} className="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-2 py-2 sm:px-4 sm:py-3 rounded-md text-xs sm:text-sm md:text-base font-medium transition-colors">
            Add Expense
          </button>
          <button onClick={() => setModalType('loan')} className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-2 py-2 sm:px-4 sm:py-3 rounded-md text-xs sm:text-sm md:text-base font-medium transition-colors">
            Add Loan
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white/80 mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No entries yet. Add your first income, expense, or loan to get started!</p>
        </div>
      </div>

      {/* Modal for Adding Income/Expense/Loan */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-lg shadow-lg p-4 sm:p-6">
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 capitalize text-gray-900 dark:text-white/80">Add {modalType}</h4>
            <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Amount</label>
                <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
                <input type="text" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" />
              </div>
              {modalType !== 'loan' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category (optional)</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" />
                </div>
              )}
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={closeModal} disabled={submitting} className="cursor-pointer px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                <button type="submit" disabled={submitting} className="cursor-pointer px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]">
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}