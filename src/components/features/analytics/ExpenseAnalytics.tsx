import React from 'react';

interface CategoryData {
  category: string;
  amount: number;
  color: string;
}

interface ExpenseAnalyticsProps {
  entries: any[];
}

export function ExpenseAnalytics({ entries }: ExpenseAnalyticsProps) {
  const expenses = entries.filter((e) => e.type === 'expense');
  
  // Group by category
  const categoryTotals = expenses.reduce((acc: Record<string, number>, entry) => {
    const cat = entry.category || 'Other';
    acc[cat] = (acc[cat] || 0) + entry.amount;
    return acc;
  }, {});

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
  ];

  const categoryData: CategoryData[] = Object.entries(categoryTotals)
    .map(([category, amount], index) => ({
      category,
      amount,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.amount - a.amount);

  const total = categoryData.reduce((sum, cat) => sum + cat.amount, 0);

  if (categoryData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Expense Analytics
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          No expense data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Expense Analytics
      </h3>

      <div className="space-y-3">
        {categoryData.map((cat) => {
          const percentage = total > 0 ? (cat.amount / total) * 100 : 0;
          
          return (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${cat.color}`} />
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                    {cat.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                    {cat.amount.toFixed(2)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${cat.color} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Expenses</span>
          <span className="text-base font-bold text-red-600 dark:text-red-400">{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
