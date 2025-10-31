import React, { useState } from 'react';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';

interface BudgetGoal {
  _id?: string;
  category: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly';
  spent?: number;
}

interface BudgetTrackerProps {
  budgets: BudgetGoal[];
  onAddBudget: (budget: Omit<BudgetGoal, '_id'>) => void;
  onDeleteBudget: (id: string) => void;
}

export function BudgetTracker({ budgets, onAddBudget, onDeleteBudget }: BudgetTrackerProps) {
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;

    onAddBudget({
      category,
      amount: parseFloat(amount),
      period,
      spent: 0,
    });

    setCategory('');
    setAmount('');
    setPeriod('monthly');
    setShowModal(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Budget Goals
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="cursor-pointer text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          + Add Goal
        </button>
      </div>

      {budgets.length === 0 ? (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          No budget goals set. Click &quot;+ Add Goal&quot; to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const percentage = budget.amount > 0 ? ((budget.spent || 0) / budget.amount) * 100 : 0;
            const isOverBudget = percentage > 100;

            return (
              <div key={budget._id} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{budget.category}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{budget.period}</p>
                  </div>
                  <button
                    onClick={() => budget._id && onDeleteBudget(budget._id)}
                    className="cursor-pointer text-red-500 hover:text-red-600 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {budget.spent?.toFixed(2)} / {budget.amount.toFixed(2)}
                    </span>
                    <span className={`font-medium ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Budget Goal">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="e.g., Food, Transport, Entertainment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Budget Amount
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="cursor-pointer w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex gap-2 sm:gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              Add Goal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
