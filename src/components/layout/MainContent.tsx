'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthHeader } from '@/lib/firebase/auth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import PendingLoanCard from '@/components/ui/PendingLoanCard';
import { useToast } from '@/components/ui/Toaster';
import { InstallPrompt } from '@/components/ui/InstallPrompt';
import * as guestStorage from '@/lib/utils/guestStorage';
import { EntryCard } from '../ui/EntryCard';
import { Button } from '../ui/Button';
import { LoanCard } from './main/LoanCard';
import { SkeletonCard } from './main/SkeletonCard';
import { StatsCard } from './main/StatsCard';

// Constants moved outside component to prevent infinite loop
const SUPPORTED_CURRENCIES = ['PKR', 'KWD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD', 'JPY'] as const;
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'];

interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    totalLoaned: number;
    totalBorrowed: number;
    netLoan: number;
  };
  recentEntries?: any[];
  recentLoans?: any[];
  entries?: any[];
  loans?: any[];
}

// Responsive Loan Card
export function MainContent() {
  const { user, loading, signIn, signInAsGuest } = useAuth();
  const { addToast } = useToast();
  const [modalType, setModalType] = useState<null | 'transaction' | 'loan'>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  // Maintain a local loans array for optimistic updates (loan additions & payments)
  const [loansState, setLoansState] = useState<any[] | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    direction: 'lent',
    counterpartyName: '',
    counterpartyEmail: '',
    dueDate: ''
  });
  const [requiresCollaboration, setRequiresCollaboration] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currency, setCurrency] = useState('PKR');
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense' | 'loans'>('all');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');

  const closeModal = () => {
    setModalType(null);
    setFormData({ amount: '', description: '', category: '', direction: 'lent', counterpartyName: '', counterpartyEmail: '', dueDate: '' });
    setRequiresCollaboration(false);
    setErrorMessage(null);
    setTransactionType('expense');
  };

  useEffect(() => {
    if (user && !user.isGuest) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    const stored = localStorage.getItem('currency');
    type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

    if (stored && SUPPORTED_CURRENCIES.includes(stored as SupportedCurrency)) {
      setCurrency(stored as SupportedCurrency);
    }
  }, []); // Empty dependency - only run once on mount

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  // Normalize and validate currencies from API
  const normalizeCurrencies = (data: DashboardData): DashboardData => {
    const validateCurrency = (curr: string) =>
      SUPPORTED_CURRENCIES.includes(curr as any) ? curr : 'PKR';

    const normalizedData = { ...data };

    if (normalizedData.entries) {
      normalizedData.entries = normalizedData.entries.map((e: any) => ({
        ...e,
        currency: validateCurrency(e.currency)
      }));
    }

    if (normalizedData.recentEntries) {
      normalizedData.recentEntries = normalizedData.recentEntries.map((e: any) => ({
        ...e,
        currency: validateCurrency(e.currency)
      }));
    }

    if (normalizedData.loans) {
      normalizedData.loans = normalizedData.loans.map((l: any) => ({
        ...l,
        currency: validateCurrency(l.currency)
      }));
    }

    if (normalizedData.recentLoans) {
      normalizedData.recentLoans = normalizedData.recentLoans.map((l: any) => ({
        ...l,
        currency: validateCurrency(l.currency)
      }));
    }

    return normalizedData;
  };

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      // Check if user is a guest
      if (user?.isGuest) {
        // Use local storage for guest users
        const guestData = guestStorage.getGuestDashboard();
        const normalizedData = normalizeCurrencies(guestData as any);
        setDashboardData(normalizedData);
        if (Array.isArray(normalizedData.loans)) {
          setLoansState(normalizedData.loans);
        }
      } else {
        // Use API for authenticated users
        const authHeaders = await getAuthHeader();
        const res = await fetch('/api/dashboard', { headers: authHeaders, cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const normalizedData = normalizeCurrencies(data.data);
          setDashboardData(normalizedData);
          if (Array.isArray(normalizedData.loans)) {
            setLoansState(normalizedData.loans);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleApproveLoan = async (loanId: string) => {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loanId}/approve`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        // Remove the approved loan from state (it's no longer pending)
        setLoansState(prev => {
          if (!prev) return null;
          return prev.filter(l => l._id !== loanId);
        });
        // Refresh dashboard to update summaries and show accepted loan
        await fetchDashboardData();
        addToast({ type: 'success', title: 'Loan Approved!', description: 'You have successfully approved this loan request.' });
      } else {
        const error = await res.json();
        addToast({ type: 'error', title: 'Approval Failed', description: error.message || 'Failed to approve loan' });
      }
    } catch (error) {
      console.error('Error approving loan:', error);
      throw error;
    }
  };

  const handleRejectLoan = async (loanId: string, reason?: string) => {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/loans/${loanId}/reject`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        // Remove the rejected loan from state completely
        setLoansState(prev => {
          if (!prev) return null;
          return prev.filter(l => l._id !== loanId);
        });
        await fetchDashboardData();
        addToast({ type: 'success', title: 'Loan Rejected', description: 'You have successfully rejected this loan request.' });
      } else {
        const error = await res.json();
        addToast({ type: 'error', title: 'Rejection Failed', description: error.message || 'Failed to reject loan' });
      }
    } catch (error) {
      console.error('Error rejecting loan:', error);
      throw error;
    }
  };

  // Calculate loan amounts from loans array
  const calculateLoanAmounts = () => {
    if (!dashboardData) return { totalLoaned: 0, totalBorrowed: 0 };

    const rawLoansCandidate: any = loansState || (dashboardData as any).loans;
    const rawLoans = Array.isArray(rawLoansCandidate)
      ? rawLoansCandidate
      : (rawLoansCandidate && Array.isArray(rawLoansCandidate.data))
        ? rawLoansCandidate.data
        : (dashboardData.recentLoans || []);

    const loans = Array.isArray(rawLoans) ? rawLoans : [];

    const totalLoaned = loans
      .filter((loan: any) => loan.direction === 'lent' && loan.status === 'active')
      .reduce((sum: number, loan: any) => sum + (loan.remainingAmount || 0), 0);

    const totalBorrowed = loans
      .filter((loan: any) => loan.direction === 'borrowed' && loan.status === 'active')
      .reduce((sum: number, loan: any) => sum + (loan.remainingAmount || 0), 0);

    return { totalLoaned, totalBorrowed };
  };

  const { totalLoaned, totalBorrowed } = calculateLoanAmounts();

  const getFilteredActivity = () => {
    if (!dashboardData) return [];

    const rawEntriesCandidate: any = (dashboardData as any).entries;
    const rawLoansCandidate: any = loansState || (dashboardData as any).loans;
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

    // Currency filter
    if (currencyFilter && currencyFilter !== 'all') {
      combined = combined.filter((item: any) => item.currency === currencyFilter);
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
      addToast({ type: 'info', title: 'No Data', description: 'No data available to export' });
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
    a.download = `finance-${new Date().toISOString().split('T')[0]}.csv`;
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

    if (modalType === 'loan' && !formData.counterpartyName.trim()) {
      setErrorMessage('Counterparty name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (user?.isGuest) {
        // Use local storage for guest users
        if (modalType === 'loan') {
          guestStorage.addGuestLoan({
            userId: user._id,
            type: 'loan',
            amount: amt,
            originalAmount: amt,
            remainingAmount: amt,
            currency: currency as any,
            description: formData.description,
            direction: formData.direction as any,
            isPersonal: false, // Guest loans with counterparty name are non-personal
            requiresCollaboration: false, // Guest loans are view-only tracking
            counterparty: {
              name: formData.counterpartyName.trim(),
              email: formData.counterpartyEmail.trim() || undefined,
            },
            loanStatus: 'accepted',
            requiresMutualApproval: false,
            pendingChanges: [], // No pending changes for guest loans
            date: new Date(),
            status: 'active',
            tags: [],
            version: 1,
            createdBy: user._id,
            lastModifiedBy: user._id,
          });
        } else {
          guestStorage.addGuestEntry({
            userId: user._id,
            type: transactionType,
            amount: amt,
            currency: currency as any,
            description: formData.description,
            category: formData.category,
            date: new Date(),
            status: 'active',
            tags: [],
            version: 1,
            createdBy: user._id,
            lastModifiedBy: user._id,
          });
        }
        closeModal();
        fetchDashboardData();
      } else {
        // Use API for authenticated users
        const authHeaders = await getAuthHeader();
        const endpoint = modalType === 'loan' ? '/api/loans' : '/api/entries';
        const payload: any = modalType === 'loan' ? {
          amount: amt,
          currency,
          description: formData.description || undefined,
          direction: formData.direction,
          counterparty: {
            name: formData.counterpartyName.trim(),
            email: formData.counterpartyEmail.trim() || undefined
          },
          requiresCollaboration,
          dueDate: formData.dueDate || undefined,
        } : {
          type: transactionType,
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
      }
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMessage(user?.isGuest ? 'Failed to save locally' : 'Network error occurred');
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
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center shadow-lg">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Finance Tracker</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">Professional money management made simple</p>
            <div className="space-y-2 sm:space-y-3 text-left text-xs sm:text-sm">
              {[
                { icon: '💰', text: 'Track income & expenses' },
                { icon: '🌍', text: 'Multi-currency support' },
                { icon: '☁️', text: 'Cloud sync & backup' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 sm:gap-3 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 sm:p-3">
                  <span className="text-xl sm:text-2xl">{feature.icon}</span>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <Button
                onClick={signIn}
                variant="primary"
                size="md"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                }
                fullWidth
              >
                Sign In
              </Button>

              <Button
                onClick={signInAsGuest}
                variant="secondary"
                size="md"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21a8 8 0 10-16 0" />
                  </svg>
                }
                fullWidth
              >
                Continue as Guest
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredActivity = getFilteredActivity();
  const isLoanPaid = (loanItem: any) => {
    if (!loanItem) return false;
    const normalizedRemaining = Number(loanItem.remainingAmount ?? loanItem.amount ?? 0);
    return loanItem.status === 'paid' || (Number.isFinite(normalizedRemaining) && normalizedRemaining <= 0);
  };
  const paidLoanItems = filteredActivity.filter((item: any) => item.isLoan && isLoanPaid(item));
  const activeActivityItems = filteredActivity.filter((item: any) => !(item.isLoan && isLoanPaid(item)));
  const shouldShowPaidSection = (activeTab === 'all' || activeTab === 'loans') && paidLoanItems.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {user.isGuest ? 'Guest Mode' : 'Dashboard'}
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="cursor-pointer px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {SUPPORTED_CURRENCIES.map(cur => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
        {/* Guest Warning */}
        {user.isGuest && (
          <div className="mb-4 sm:mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-0.5 sm:mb-1">Guest Mode - Data Stored Locally</p>
                <p className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-300">Sign in to enable cloud sync and backup</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 max-[420px]:grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
          <StatsCard
            title="Balance"
            value={`${currency} ${dashboardData?.summary.balance.toFixed(2) || '0.00'}`}
            loading={dataLoading}
            color="blue"
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Income"
            value={`${currency} ${dashboardData?.summary.totalIncome.toFixed(2) || '0.00'}`}
            loading={dataLoading}
            color="green"
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            }
          />
          <StatsCard
            title="Expenses"
            value={`${currency} ${dashboardData?.summary.totalExpense.toFixed(2) || '0.00'}`}
            loading={dataLoading}
            color="red"
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            }
          />
          <StatsCard
            title="Lent Out"
            value={`${currency} ${totalLoaned.toFixed(2)}`}
            loading={dataLoading}
            color="cyan"
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatsCard
            title="Borrowed"
            value={`${currency} ${totalBorrowed.toFixed(2)}`}
            loading={dataLoading}
            color="orange"
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
          />
        </div>

        {/* Quick Actions - Desktop */}
        <div className="hidden sm:grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button
            onClick={() => setModalType('transaction')}
            variant="primary"
            size="md"
            icon={
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            }
            fullWidth
          >
            Add Transaction
          </Button>
          <Button
            onClick={() => setModalType('loan')}
            variant="secondary"
            size="md"
            icon={
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            }
            fullWidth
          >
            Add Loan
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? 'primary' : 'secondary'}
                size="sm"
                icon={
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                }
              >
                <span className="hidden sm:inline">Filters</span>
              </Button>
              <Button
                onClick={exportToCSV}
                variant="success"
                size="sm"
                icon={
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                }
              >
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">Currency</label>
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="cursor-pointer w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Currencies</option>
                  {SUPPORTED_CURRENCIES.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="cursor-pointer w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="cursor-pointer w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
                  className="cursor-pointer w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Date (Newest First)</option>
                  <option value="amount">Amount (Highest First)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Activity Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Enhanced Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex">
              {(['all', 'income', 'expense', 'loans'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`cursor-pointer flex-1 sm:min-w-[90px] px-3 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm font-medium capitalize transition-all whitespace-nowrap ${activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Activity List */}
          <div className="p-3 sm:p-4">
            {dataLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : activeActivityItems.length > 0 || shouldShowPaidSection ? (
              <div className="space-y-3 sm:space-y-4">
                {/* Pending Loan Requests Section */}
                {(() => {
                  const pendingLoans = filteredActivity.filter((item: any) => {
                    if (!item.isLoan) return false;
                    const loanItem = item as any;
                    const requiresApproval = Boolean(loanItem.requiresCollaboration || loanItem.requiresMutualApproval || loanItem.requiresApproval);
                    return loanItem.loanStatus === 'pending' && requiresApproval;
                  });

                  if (pendingLoans.length > 0) {
                    return (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3 px-2">
                          <span className="text-yellow-600 font-semibold text-sm">
                            ⚠️ Pending Loan Approvals ({pendingLoans.length})
                          </span>
                        </div>
                        <div className="space-y-3">
                          {pendingLoans.map((loan: any) => (
                            <PendingLoanCard
                              key={loan._id}
                              loan={loan}
                              onApprove={handleApproveLoan}
                              onReject={handleRejectLoan}
                              isCounterparty={loan.counterpartyUserId === (user?.firebaseUid || user?._id)}
                              currentUserId={user?.firebaseUid || user?._id || ''}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Regular Activity Items */}
                {activeActivityItems.map((item: any) => (
                  item.isLoan ? (
                    <LoanCard
                      key={item._id}
                      loan={item}
                      onUpdate={fetchDashboardData}
                      onOptimisticLoanUpdate={(updatedLoan: any) => {
                        setLoansState(prev => {
                          if (!prev) return [updatedLoan];
                          return prev.map(l => (l._id === updatedLoan._id ? { ...l, ...updatedLoan } : l));
                        });
                      }}
                      currentUserId={user?.firebaseUid || user?._id || ''}
                      addToast={addToast}
                    />
                  ) : (
                    <EntryCard key={item._id} entry={item} onUpdate={fetchDashboardData} addToast={addToast} />
                  )
                ))}

                {shouldShowPaidSection && (
                  <div className="pt-4 sm:pt-5 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3 px-2">
                      <span className="text-green-600 font-semibold text-sm">
                        ✅ Paid Loans ({paidLoanItems.length})
                      </span>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      {paidLoanItems.map((loanItem: any) => (
                        <LoanCard
                          key={loanItem._id}
                          loan={loanItem}
                          onUpdate={fetchDashboardData}
                          onOptimisticLoanUpdate={(updatedLoan: any) => {
                            setLoansState(prev => {
                              if (!prev) return [updatedLoan];
                              return prev.map(l => (l._id === updatedLoan._id ? { ...l, ...updatedLoan } : l));
                            });
                          }}
                          currentUserId={user?.firebaseUid || user?._id || ''}
                          addToast={addToast}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                  No {activeTab !== 'all' ? activeTab : 'data'} found
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
                  {searchQuery || dateRange.start || dateRange.end ? 'Try adjusting your filters' : 'Get started by adding your first entry'}
                </p>
                {!searchQuery && !dateRange.start && !dateRange.end && (
                  <Button
                    onClick={() => setModalType(activeTab === 'loans' ? 'loan' : 'transaction')}
                    variant="primary"
                    size="md"
                    icon={
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    }
                  >
                    Add {activeTab === 'loans' ? 'Loan' : 'Transaction'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced FAB - Mobile */}
      <div className="sm:hidden fixed bottom-5 sm:bottom-6 right-5 sm:right-6 z-40">
        {showQuickActions && (
          <>
            <div className="absolute bottom-16 sm:bottom-20 right-0 space-y-2 sm:space-y-3 mb-2">
              <button
                onClick={() => { setModalType('loan'); setShowQuickActions(false); }}
                className="cursor-pointer flex items-center gap-2 sm:gap-3 bg-blue-600 hover:bg-blue-700 text-white pl-4 sm:pl-5 pr-5 sm:pr-6 py-2.5 sm:py-3 rounded-full shadow-lg text-xs sm:text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                <span className="whitespace-nowrap">Add Loan</span>
              </button>
              <button
                onClick={() => { setModalType('transaction'); setShowQuickActions(false); }}
                className="cursor-pointer flex items-center gap-2 sm:gap-3 bg-green-600 hover:bg-green-700 text-white pl-4 sm:pl-5 pr-5 sm:pr-6 py-2.5 sm:py-3 rounded-full shadow-lg text-xs sm:text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="whitespace-nowrap">Add Transaction</span>
              </button>
            </div>
            <div className="fixed inset-0 bg-black/30 -z-10" onClick={() => setShowQuickActions(false)} />
          </>
        )}

        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={`cursor-pointer w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all ${showQuickActions ? 'rotate-45' : ''
            }`}
        >
          <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Enhanced Modal */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-lg shadow-xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                {modalType === 'loan' ? 'Add Loan' : 'Add Transaction'}
              </h3>
              <button
                onClick={closeModal}
                disabled={submitting}
                className="cursor-pointer p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-3 sm:space-y-5">
              {errorMessage && (
                <div className="flex items-start gap-2 sm:gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200">{errorMessage}</p>
                </div>
              )}

              {modalType === 'transaction' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide">Transaction Type</label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setTransactionType('expense')}
                      className={`cursor-pointer p-3 sm:p-4 rounded-lg border-2 transition-all ${transactionType === 'expense'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <div className="text-sm sm:text-base font-semibold">Expense</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType('income')}
                      className={`cursor-pointer p-3 sm:p-4 rounded-lg border-2 transition-all ${transactionType === 'income'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <div className="text-sm sm:text-base font-semibold">Income</div>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">
                      {currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full pl-16 sm:pl-20 pr-3 sm:pr-4 py-2.5 sm:py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-base sm:text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="cursor-pointer w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-medium text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  >
                    {SUPPORTED_CURRENCIES.map(curr => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Optional"
                />
              </div>

              {modalType === 'transaction' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="cursor-pointer w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-medium text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  >
                    <option value="">Select (optional)</option>
                    {(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {modalType === 'loan' && (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide">Loan Type</label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, direction: 'lent' })}
                        className={`cursor-pointer p-3 sm:p-4 rounded-lg border-2 transition-all ${formData.direction === 'lent'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                          }`}
                      >
                        <div className="text-sm sm:text-base font-semibold mb-0.5 sm:mb-1">I Lent</div>
                        <div className="text-[10px] sm:text-xs opacity-75">They owe me</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, direction: 'borrowed' })}
                        className={`cursor-pointer p-3 sm:p-4 rounded-lg border-2 transition-all ${formData.direction === 'borrowed'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                          }`}
                      >
                        <div className="text-sm sm:text-base font-semibold mb-0.5 sm:mb-1">I Borrowed</div>
                        <div className="text-[10px] sm:text-xs opacity-75">I owe them</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">Counterparty Name</label>
                    <input
                      type="text"
                      required
                      value={formData.counterpartyName}
                      onChange={(e) => setFormData({ ...formData, counterpartyName: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="Person or company name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">Email (Optional)</label>
                    <input
                      type="email"
                      value={formData.counterpartyEmail}
                      onChange={(e) => setFormData({ ...formData, counterpartyEmail: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                    <label className="flex items-start gap-2.5 sm:gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={requiresCollaboration}
                        onChange={(e) => setRequiresCollaboration(e.target.checked)}
                        className="cursor-pointer mt-0.5 w-4 h-4 sm:w-5 sm:h-5 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          Share & Collaborate with Counterparty
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          <span className="font-medium text-blue-600 dark:text-blue-400">Checked:</span> Counterparty can view, add payments, and collaborate in real-time (requires their approval).
                          <br />
                          <span className="font-medium text-gray-700 dark:text-gray-300">Unchecked:</span> Private tracking - only you can see this loan.
                        </div>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-wide">Due Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="cursor-pointer w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={submitting}
                  fullWidth
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  fullWidth
                  size="md"
                >
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}