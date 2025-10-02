'use client';

import type { ExpenseCategory } from "@/types";

type ExpenseFormData = {
  amount: string;
  currency: string;
  category: ExpenseCategory;
  description: string;
};

export function ExpenseForm({
  form,
  onChange,
  onSubmit,
  saving,
  categories,
  currencies,
}: {
  form: ExpenseFormData;
  onChange: (form: ExpenseFormData) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  categories: ExpenseCategory[];
  currencies: readonly string[];
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-background border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Add Expense</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => onChange({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) => onChange({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              >
                {currencies.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              Category *
            </label>
            <select
              value={form.category}
              onChange={(e) => onChange({ ...form, category: e.target.value as ExpenseCategory })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
              placeholder="Optional notes..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Add Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
