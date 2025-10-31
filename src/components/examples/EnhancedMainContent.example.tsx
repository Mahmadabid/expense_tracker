// Example: How to integrate new components into MainContent.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared/Button';
import { StatsCard } from '@/components/shared/StatsCard';
import { TransactionCard } from '@/components/features/transactions/TransactionCard';
import { FilterBar } from '@/components/features/filters/FilterBar';
import { ExportButton } from '@/components/features/export/ExportButton';
import { BudgetTracker } from '@/components/features/budget/BudgetTracker';
import { ExpenseAnalytics } from '@/components/features/analytics/ExpenseAnalytics';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants/categories';

export function EnhancedMainContent() {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Budget states
  const [budgets, setBudgets] = useState<any[]>([]);
  
  // Data states (replace with your actual data fetching)
  const [entries, setEntries] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesDescription = entry.description?.toLowerCase().includes(searchLower);
      const matchesCategory = entry.category?.toLowerCase().includes(searchLower);
      if (!matchesDescription && !matchesCategory) return false;
    }
    
    // Category filter
    if (selectedCategory && entry.category !== selectedCategory) {
      return false;
    }
    
    // Date range filter
    const entryDate = new Date(entry.date);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (entryDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (entryDate > toDate) return false;
    }
    
    return true;
  });

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setDateFrom('');
    setDateTo('');
  };

  // Budget management
  const handleAddBudget = (budget: any) => {
    const newBudget = { ...budget, _id: Date.now().toString() };
    setBudgets([...budgets, newBudget]);
    // TODO: Save to backend or localStorage
    localStorage.setItem('budgets', JSON.stringify([...budgets, newBudget]));
  };

  const handleDeleteBudget = (id: string) => {
    const updated = budgets.filter(b => b._id !== id);
    setBudgets(updated);
    // TODO: Delete from backend or localStorage
    localStorage.setItem('budgets', JSON.stringify(updated));
  };

  // Calculate spent amounts for budgets
  useEffect(() => {
    if (budgets.length === 0) return;
    
    const updatedBudgets = budgets.map(budget => {
      const spent = entries
        .filter(e => e.type === 'expense' && e.category === budget.category)
        .reduce((sum, e) => sum + e.amount, 0);
      return { ...budget, spent };
    });
    setBudgets(updatedBudgets);
  }, [entries]);

  // Load budgets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('budgets');
    if (saved) {
      try {
        setBudgets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load budgets', e);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <ExportButton 
          data={{
            entries: entries,
            loans: loans,
            summary: dashboardData?.summary
          }}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatsCard
          title="Balance"
          value={`PKR ${dashboardData?.summary?.balance?.toFixed(2) || '0.00'}`}
          icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="blue"
        />
        {/* Add more StatsCard components... */}
      </div>

      {/* Budget Tracker */}
      <BudgetTracker
        budgets={budgets}
        onAddBudget={handleAddBudget}
        onDeleteBudget={handleDeleteBudget}
      />

      {/* Expense Analytics */}
      <ExpenseAnalytics entries={entries} />

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        onClearFilters={handleClearFilters}
      />

      {/* Transactions List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Transactions
          {filteredEntries.length !== entries.length && (
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({filteredEntries.length} of {entries.length})
            </span>
          )}
        </h2>
        
        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No transactions found
            </p>
          ) : (
            filteredEntries.map((entry) => (
              <TransactionCard
                key={entry._id}
                entry={entry}
                onUpdate={() => {
                  // Refresh data
                }}
                addToast={(toast: any) => {
                  // Show toast notification
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            // Open add transaction modal
          }}
          className="shadow-lg"
        >
          + Add Transaction
        </Button>
      </div>
    </div>
  );
}
