'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthHeader } from '@/lib/firebase/auth';
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

// Compact Entry Card Component
function EntryCard({ entry, onUpdate, currency }: { entry: any; onUpdate: () => void; currency: string }) {
  const [showActions, setShowActions] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this entry?')) return;
    setDeleting(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/entries/${entry._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="group relative flex items-center gap-3 p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
        entry.type === 'income' 
          ? 'bg-green-100 dark:bg-green-900/30' 
          : 'bg-red-100 dark:bg-red-900/30'
      }`}>
        {entry.type === 'income' ? (
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ) : (
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {entry.description || entry.category || 'Untitled'}
          </p>
          {entry.category && entry.description && (
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">• {entry.category}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold whitespace-nowrap ${
          entry.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {entry.type === 'income' ? '+' : '-'}{currency} {entry.amount?.toFixed(2)}
        </span>
        
        {/* Actions */}
        <div className="relative">
          <button 
            onClick={() => setShowActions(!showActions)}
            className="cursor-pointer opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-opacity"
          >
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
          {showActions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
              <div className="absolute right-0 top-8 z-[60] w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                <button 
                  onClick={handleDelete} 
                  disabled={deleting}
                  className="cursor-pointer w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
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

// Compact Loan Card Component
function LoanCard({ loan, onUpdate, currency }: { loan: any; onUpdate: () => void; currency: string }) {
  const [showActions, setShowActions] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);

  const handleAddPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ 
          amount: amt, 
          date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
          description: paymentDescription || undefined
        }),
      });
      if (res.ok) {
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentDescription('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to add payment:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseLoan = async () => {
    if (!confirm('Mark as paid?')) return;
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status: 'paid' }),
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error('Failed to close loan:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this loan?')) return;
    setProcessing(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loan._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Main Loan Info */}
        <div className="group relative flex items-center gap-3 p-2.5 sm:p-3 hover:shadow-md transition-all">
          {/* Icon */}
          <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
            loan.direction === 'lent' 
              ? 'bg-blue-100 dark:bg-blue-900/30' 
              : 'bg-orange-100 dark:bg-orange-900/30'
          }`}>
            <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${loan.direction === 'lent' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {loan.counterparty?.name || 'Unknown'}
              </p>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                loan.status === 'active' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 
                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              }`}>
                {loan.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {loan.direction === 'lent' ? 'You lent' : 'You borrowed'} • {new Date(loan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>

          {/* Amount */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {currency} {loan.remainingAmount?.toFixed(2)}
              </p>
              {loan.payments?.length > 0 && (
                <button
                  onClick={() => setShowPayments(!showPayments)}
                  className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {loan.payments.length} payment{loan.payments.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="relative">
              <button 
                onClick={() => setShowActions(!showActions)}
                className="cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-opacity"
              >
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
              {showActions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                  <div className="absolute right-0 top-8 z-[60] w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                    {loan.status === 'active' && (
                      <>
                        <button 
                          onClick={() => { setShowPaymentModal(true); setShowActions(false); }}
                          className="cursor-pointer w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          Add Payment
                        </button>
                        <button 
                          onClick={handleCloseLoan}
                          className="cursor-pointer w-full px-3 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          Mark as Paid
                        </button>
                      </>
                    )}
                    <button 
                      onClick={handleDelete}
                      disabled={processing}
                      className="cursor-pointer w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payments List */}
        {showPayments && loan.payments?.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Payment History</p>
            <div className="space-y-1.5">
              {loan.payments.map((payment: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium">
                      {currency} {payment.amount?.toFixed(2)}
                    </p>
                    {payment.description && (
                      <p className="text-gray-500 dark:text-gray-400 truncate">{payment.description}</p>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs ml-2">
                    {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-lg rounded-t-2xl shadow-xl">
            <div className="p-6">
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Payment</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Amount *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={paymentAmount} 
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 text-base focus:outline-none focus:border-blue-500"
                    placeholder={`Max: ${loan.remainingAmount?.toFixed(2)}`}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description</label>
                  <input 
                    type="text" 
                    value={paymentDescription} 
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 text-base focus:outline-none focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Payment Date</label>
                  <input 
                    type="date" 
                    value={paymentDate} 
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="cursor-pointer w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 text-base focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowPaymentModal(false)} 
                    disabled={processing}
                    className="cursor-pointer flex-1 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddPayment} 
                    disabled={processing}
                    className="cursor-pointer flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                  >
                    {processing ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MainContent() {
  const { user, loading } = useAuth();
  const [modalType, setModalType] = useState<null | 'income' | 'expense' | 'loan'>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ amount: '', description: '', category: '', direction: 'lent', counterpartyName: '', counterpartyEmail: '', dueDate: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currency, setCurrency] = useState('PKR');
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense' | 'loans'>('all');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const SUPPORTED_CURRENCIES = ['PKR','KWD','USD','EUR','GBP','AED','SAR','CAD','AUD','JPY'] as const;
  const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];
  const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'];

  const closeModal = () => {
    setModalType(null);
    setFormData({ amount: '', description: '', category: '', direction: 'lent', counterpartyName: '', counterpartyEmail: '', dueDate: '' });
    setErrorMessage(null);
  };

  useEffect(() => {
    if (user && !user.isGuest) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    const stored = localStorage.getItem('currency');
    if (stored && SUPPORTED_CURRENCIES.includes(stored as any)) {
      setCurrency(stored);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch('/api/dashboard', { headers: authHeaders });
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

  const getFilteredActivity = () => {
    if (!dashboardData) return [];
    
    const entries = (dashboardData.recentEntries || []).map((e: any) => ({ ...e, isLoan: false }));
    const loans = (dashboardData.recentLoans || []).map((l: any) => ({ ...l, isLoan: true }));
    let combined = [...entries, ...loans];

    // Filter by tab
    if (activeTab === 'loans') {
      combined = loans;
    } else if (activeTab !== 'all') {
      combined = entries.filter((e: any) => e.type === activeTab);
    }

    // Search filter
    if (searchQuery) {
      combined = combined.filter((item: any) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          item.description?.toLowerCase().includes(searchLower) ||
          item.category?.toLowerCase().includes(searchLower) ||
          item.counterparty?.name?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Date range filter
    if (dateRange.start) {
      combined = combined.filter((item: any) => {
        const itemDate = new Date(item.date || item.createdAt);
        return itemDate >= new Date(dateRange.start);
      });
    }
    if (dateRange.end) {
      combined = combined.filter((item: any) => {
        const itemDate = new Date(item.date || item.createdAt);
        return itemDate <= new Date(dateRange.end);
      });
    }

    // Sort
    combined.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
      } else {
        return (b.amount || b.remainingAmount || 0) - (a.amount || a.remainingAmount || 0);
      }
    });

    return combined;
  };

  const exportToCSV = () => {
    const data = getFilteredActivity();
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency'];
    const rows = data.map((item: any) => {
      if (item.isLoan) {
        return [
          new Date(item.date).toLocaleDateString(),
          item.direction === 'lent' ? 'Lent' : 'Borrowed',
          item.description || '',
          item.counterparty?.name || '',
          item.remainingAmount || 0,
          item.currency || currency
        ];
      } else {
        return [
          new Date(item.date).toLocaleDateString(),
          item.type,
          item.description || '',
          item.category || '',
          item.amount || 0,
          item.currency || currency
        ];
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    if (modalType === 'loan' && !formData.counterpartyName) {
      setErrorMessage('Counterparty name is required');
      return;
    }

    setSubmitting(true);
    try {
      const authHeaders = await getAuthHeader();
      const endpoint = modalType === 'loan' ? '/api/loans' : '/api/entries';
      const payload: any = modalType === 'loan' ? {
        amount: amt,
        currency,
        description: formData.description || undefined,
        direction: formData.direction,
        counterparty: { name: formData.counterpartyName, email: formData.counterpartyEmail || undefined },
        dueDate: formData.dueDate || undefined,
      } : {
        type: modalType,
        amount: amt,
        currency,
        description: formData.description || undefined,
        category: formData.category || undefined,
        date: new Date().toISOString(),
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        closeModal();
        fetchDashboardData();
      } else {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.message || 'Failed to create entry');
      }
    } catch (err) {
      setErrorMessage('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Expense Tracker
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Smart money management made simple
            </p>
            <div className="space-y-3 text-left text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Track income, expenses & loans</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Multi-currency support</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Cloud sync across devices</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                {user.isGuest ? 'Guest Mode' : 'Dashboard'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            {/* Currency Selector */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="cursor-pointer px-3 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {SUPPORTED_CURRENCIES.map(cur => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 pb-24 sm:pb-4">
        {/* Guest Warning */}
        {user.isGuest && (
          <div className="mb-3 sm:mb-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
            <div className="flex items-start gap-2 sm:gap-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                  <span className="font-medium">Guest Mode:</span> Data stored locally. Sign in to sync across devices.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats - Tighter spacing */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 mb-3 sm:mb-4">
          {/* Balance */}
          <div className="col-span-2 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl p-4 sm:p-5 text-white shadow-lg">
            <p className="text-xs sm:text-sm opacity-90 mb-1">Total Balance</p>
            <p className="text-2xl sm:text-3xl font-bold truncate">
              {dataLoading ? '...' : `${currency} ${dashboardData?.summary.balance.toFixed(2) || '0.00'}`}
            </p>
            <div className="flex items-center gap-2 sm:gap-4 mt-3 pt-3 border-t border-white/20 text-xs sm:text-sm">
              <div className="flex-1 min-w-0">
                <p className="opacity-75 text-xs">Income</p>
                <p className="font-semibold truncate">{currency} {dashboardData?.summary.totalIncome.toFixed(2) || '0.00'}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="opacity-75 text-xs">Expenses</p>
                <p className="font-semibold truncate">{currency} {dashboardData?.summary.totalExpense.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>

          {/* Lent */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">You Lent</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {dataLoading ? '...' : `${currency} ${dashboardData?.summary.totalLoaned.toFixed(2) || '0.00'}`}
            </p>
          </div>

          {/* Borrowed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Borrowed</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {dataLoading ? '...' : `${currency} ${dashboardData?.summary.totalBorrowed.toFixed(2) || '0.00'}`}
            </p>
          </div>
        </div>

        {/* Quick Actions - Desktop - Tighter */}
        <div className="hidden sm:flex gap-2.5 mb-3 sm:mb-4">
          <button 
            onClick={() => setModalType('income')}
            className="cursor-pointer flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 sm:py-3 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Income
          </button>
          <button 
            onClick={() => setModalType('expense')}
            className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 sm:py-3 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Add Expense
          </button>
          <button 
            onClick={() => setModalType('loan')}
            className="cursor-pointer flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 sm:py-3 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Add Loan
          </button>
        </div>

        {/* Search and Filters - Tighter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 mb-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter and Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="cursor-pointer flex-1 sm:flex-initial px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button
                onClick={exportToCSV}
                className="cursor-pointer flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
                  className="cursor-pointer w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Activity Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex min-w-max sm:min-w-0">
              {(['all', 'income', 'expense', 'loans'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`cursor-pointer flex-1 min-w-[80px] px-4 py-2.5 text-xs sm:text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Activity List */}
          <div className="p-3">
            {dataLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : getFilteredActivity().length > 0 ? (
              <div className="space-y-1.5">
                {getFilteredActivity().map((item: any) => (
                  item.isLoan ? (
                    <LoanCard key={item._id} loan={item} onUpdate={fetchDashboardData} currency={currency} />
                  ) : (
                    <EntryCard key={item._id} entry={item} onUpdate={fetchDashboardData} currency={currency} />
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                  No {activeTab !== 'all' ? activeTab : 'activity'} yet
                </p>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Start by adding your first entry
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button - Mobile */}
      <div className="sm:hidden fixed bottom-6 right-4 z-50">
        {/* Quick Action Buttons */}
        {showQuickActions && (
          <div className="absolute bottom-16 right-0 space-y-3 mb-2">
            <button
              onClick={() => { setModalType('loan'); setShowQuickActions(false); }}
              className="cursor-pointer flex items-center gap-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white pl-4 pr-5 py-3 rounded-full shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-sm">Loan</span>
            </button>
            <button
              onClick={() => { setModalType('expense'); setShowQuickActions(false); }}
              className="cursor-pointer flex items-center gap-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white pl-4 pr-5 py-3 rounded-full shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              <span className="font-medium text-sm">Expense</span>
            </button>
            <button
              onClick={() => { setModalType('income'); setShowQuickActions(false); }}
              className="cursor-pointer flex items-center gap-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white pl-4 pr-5 py-3 rounded-full shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium text-sm">Income</span>
            </button>
          </div>
        )}

        {/* Backdrop */}
        {showQuickActions && (
          <div 
            className="fixed inset-0 bg-black/20 -z-10" 
            onClick={() => setShowQuickActions(false)} 
          />
        )}

        {/* Main FAB */}
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="cursor-pointer w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        >
          <svg 
            className={`w-6 h-6 transition-transform ${showQuickActions ? 'rotate-45' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add Entry Modal - Responsive */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white capitalize">
                Add {modalType}
              </h3>
              <button
                onClick={closeModal}
                className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {errorMessage && (
                <div className="flex items-start gap-2 sm:gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-xs sm:text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full pl-16 sm:pl-20 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-base sm:text-lg font-semibold focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="Optional"
                />
              </div>

              {modalType !== 'loan' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="cursor-pointer w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                  >
                    <option value="">Select category</option>
                    {(modalType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {modalType === 'loan' && (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Loan Type *
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, direction: 'lent'})}
                        className={`cursor-pointer p-3 sm:p-4 rounded-xl border-2 transition-all ${
                          formData.direction === 'lent'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-medium">I Lent</div>
                        <div className="text-xs opacity-75 mt-1">They owe me</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, direction: 'borrowed'})}
                        className={`cursor-pointer p-3 sm:p-4 rounded-xl border-2 transition-all ${
                          formData.direction === 'borrowed'
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-medium">I Borrowed</div>
                        <div className="text-xs opacity-75 mt-1">I owe them</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Counterparty Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.counterpartyName}
                      onChange={(e) => setFormData({...formData, counterpartyName: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                      placeholder="Person or company name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.counterpartyEmail}
                      onChange={(e) => setFormData({...formData, counterpartyEmail: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="cursor-pointer w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="cursor-pointer flex-1 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer flex-1 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}