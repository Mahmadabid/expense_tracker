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
  // Old field names kept for backward compatibility
  recentEntries?: any[];
  recentLoans?: any[];
  // New full datasets
  entries?: any[];
  loans?: any[];
}

// Clean Entry Card Component
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
    <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-4 p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${entry.type === 'income'
          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
          {entry.type === 'income' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {entry.description || entry.category || 'Untitled'}
            </p>
            {entry.category && entry.description && (
              <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                {entry.category}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-3">
          <span className={`text-base font-semibold whitespace-nowrap ${entry.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
            {entry.type === 'income' ? '+' : '-'}{currency} {entry.amount?.toFixed(2)}
          </span>

          {/* Actions */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="cursor-pointer opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-opacity"
            >
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-8 z-20 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="cursor-pointer w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Clean Loan Card Component
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

  const progress = ((loan.amount - loan.remainingAmount) / loan.amount) * 100;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
        {/* Main Loan Info */}
        <div className="group p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${loan.direction === 'lent'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
              }`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {loan.counterparty?.name || 'Unknown'}
                </p>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${loan.status === 'active'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  }`}>
                  {loan.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{loan.direction === 'lent' ? 'You lent' : 'You borrowed'}</span>
                <span>•</span>
                <span>{new Date(loan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">
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
                  className="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
                {showActions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                    <div className="absolute right-0 top-8 z-20 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                      {loan.status === 'active' && (
                        <>
                          <button
                            onClick={() => { setShowPaymentModal(true); setShowActions(false); }}
                            className="cursor-pointer w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            Add Payment
                          </button>
                          <button
                            onClick={handleCloseLoan}
                            className="cursor-pointer w-full px-3 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            Mark as Paid
                          </button>
                        </>
                      )}
                      <button
                        onClick={handleDelete}
                        disabled={processing}
                        className="cursor-pointer w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {loan.status === 'active' && loan.amount > loan.remainingAmount && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span>{progress.toFixed(0)}% paid</span>
                <span>{currency} {(loan.amount - loan.remainingAmount).toFixed(2)} of {loan.amount.toFixed(2)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${loan.direction === 'lent' ? 'bg-blue-500' : 'bg-orange-500'
                    }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Payments List */}
        {showPayments && loan.payments?.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Payment History</p>
            <div className="space-y-2">
              {loan.payments.map((payment: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium">
                      {currency} {payment.amount?.toFixed(2)}
                    </p>
                    {payment.description && (
                      <p className="text-gray-500 dark:text-gray-400 truncate mt-0.5">{payment.description}</p>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 ml-2">
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
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Add Payment</h4>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="cursor-pointer w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    disabled={processing}
                    className="cursor-pointer flex-1 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPayment}
                    disabled={processing}
                    className="cursor-pointer flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-colors"
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

  const SUPPORTED_CURRENCIES = ['PKR', 'KWD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD', 'JPY'] as const;
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

    // New simplified response (arrays) with backward compatibility
    const rawEntriesCandidate: any = (dashboardData as any).entries;
    const rawLoansCandidate: any = (dashboardData as any).loans;
    const rawEntries = Array.isArray(rawEntriesCandidate)
      ? rawEntriesCandidate
      : (rawEntriesCandidate && Array.isArray(rawEntriesCandidate.data))
        ? rawEntriesCandidate.data
        : (dashboardData.recentEntries || []);
    const rawLoans = Array.isArray(rawLoansCandidate)
      ? rawLoansCandidate
      : (rawLoansCandidate && Array.isArray(rawLoansCandidate.data))
        ? rawLoansCandidate.data
        : (dashboardData.recentLoans || []);
    const entries = Array.isArray(rawEntries) ? rawEntries.map((e: any) => ({ ...e, isLoan: false })) : [];
    const loans = Array.isArray(rawLoans) ? rawLoans.map((l: any) => ({ ...l, isLoan: true })) : [];
    let combined = [...entries, ...loans];

    if (activeTab === 'loans') {
      combined = loans;
    } else if (activeTab !== 'all') {
      combined = entries.filter((e: any) => e.type === activeTab);
    }

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-6">
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
            <div className="space-y-3 text-left">
              {[
                'Track income, expenses & loans',
                'Multi-currency support',
                'Cloud sync across devices'
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{feature}</span>
                </div>
              ))}
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {user.isGuest ? 'Guest Mode' : 'Dashboard'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Currency Selector */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUPPORTED_CURRENCIES.map(cur => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Guest Warning */}
        {user.isGuest && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Guest Mode
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Data stored locally. Sign in to sync across devices.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Balance Card */}
          <div className="sm:col-span-2 bg-blue-600 dark:bg-blue-700 rounded-lg p-6 text-white">
            <p className="text-sm font-medium opacity-90 mb-2">Total Balance</p>
            <p className="text-4xl font-bold mb-4">
              {dataLoading ? '...' : `${currency} ${dashboardData?.summary.balance.toFixed(2) || '0.00'}`}
            </p>
            <div className="flex items-center gap-6 pt-4 border-t border-white/20">
              <div className="flex-1">
                <p className="text-xs opacity-75 mb-1">Income</p>
                <p className="font-semibold">{currency} {dashboardData?.summary.totalIncome.toFixed(2) || '0.00'}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs opacity-75 mb-1">Expenses</p>
                <p className="font-semibold">{currency} {dashboardData?.summary.totalExpense.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>

          {/* Lent Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">You Lent</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {dataLoading ? '...' : `${currency} ${dashboardData?.summary.totalLoaned.toFixed(2) || '0.00'}`}
                </p>
              </div>
            </div>
          </div>

          {/* Borrowed Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Borrowed</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {dataLoading ? '...' : `${currency} ${dashboardData?.summary.totalBorrowed.toFixed(2) || '0.00'}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Desktop */}
        <div className="hidden sm:grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setModalType('income')}
            className="cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Income
          </button>
          <button
            onClick={() => setModalType('expense')}
            className="cursor-pointer bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Add Expense
          </button>
          <button
            onClick={() => setModalType('loan')}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Add Loan
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
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
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter and Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`cursor-pointer flex-1 sm:flex-initial px-4 py-2 rounded-lg font-medium text-sm transition-colors ${showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                Filter
              </button>
              <button
                onClick={exportToCSV}
                className="cursor-pointer flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Export
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
                  className="cursor-pointer w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Activity Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {(['all', 'income', 'expense', 'loans'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`cursor-pointer flex-1 px-4 py-3 max-[320px]:px-2 text-sm font-medium capitalize transition-colors ${activeTab === tab
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
          <div className="p-4">
            {dataLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : getFilteredActivity().length > 0 ? (
              <div className="space-y-2">
                {getFilteredActivity().map((item: any) => (
                  item.isLoan ? (
                    <LoanCard key={item._id} loan={item} onUpdate={fetchDashboardData} currency={currency} />
                  ) : (
                    <EntryCard key={item._id} entry={item} onUpdate={fetchDashboardData} currency={currency} />
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-base font-medium text-gray-900 dark:text-white mb-2">
                  No {activeTab !== 'all' ? activeTab : 'activity'} yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
          <div className="absolute bottom-20 right-0 space-y-3">
            <button
              onClick={() => { setModalType('loan'); setShowQuickActions(false); }}
              className="cursor-pointer flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white pl-4 pr-5 py-3 rounded-full shadow-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Loan</span>
            </button>
            <button
              onClick={() => { setModalType('expense'); setShowQuickActions(false); }}
              className="cursor-pointer flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white pl-4 pr-5 py-3 rounded-full shadow-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              <span className="font-medium">Expense</span>
            </button>
            <button
              onClick={() => { setModalType('income'); setShowQuickActions(false); }}
              className="cursor-pointer flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white pl-4 pr-5 py-3 rounded-full shadow-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">Income</span>
            </button>
          </div>
        )}

        {/* Backdrop */}
        {showQuickActions && (
          <div
            className="fixed inset-0 bg-black/30 -z-10"
            onClick={() => setShowQuickActions(false)}
          />
        )}

        {/* Main FAB */}
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={`cursor-pointer w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all ${showQuickActions ? 'rotate-45' : ''
            }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add Entry Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-lg rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
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
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {errorMessage && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full pl-20 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              {modalType !== 'loan' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="cursor-pointer w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Loan Type *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, direction: 'lent' })}
                        className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${formData.direction === 'lent'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        <div className="text-sm font-medium">I Lent</div>
                        <div className="text-xs opacity-75 mt-1">They owe me</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, direction: 'borrowed' })}
                        className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${formData.direction === 'borrowed'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        <div className="text-sm font-medium">I Borrowed</div>
                        <div className="text-xs opacity-75 mt-1">I owe them</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Counterparty Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.counterpartyName}
                      onChange={(e) => setFormData({ ...formData, counterpartyName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Person or company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.counterpartyEmail}
                      onChange={(e) => setFormData({ ...formData, counterpartyEmail: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="cursor-pointer w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="cursor-pointer flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}