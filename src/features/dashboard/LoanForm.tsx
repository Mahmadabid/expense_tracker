'use client';

import type { UserRecord } from "@/types";

type LoanRole = "lender" | "borrower";

type LoanFormData = {
  role: LoanRole;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  useExistingUser: boolean;
  amount: string;
  currency: string;
  description: string;
  dueDate: string;
};

export function LoanForm({
  form,
  onChange,
  onSubmit,
  saving,
  currencies,
  counterpartOptions,
}: {
  form: LoanFormData;
  onChange: (form: LoanFormData) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  currencies: readonly string[];
  counterpartOptions: UserRecord[];
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-background border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Add Loan</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-2">
              I am the... *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={form.role === "lender"}
                  onChange={() => onChange({ ...form, role: "lender" })}
                  className="mr-2"
                />
                <span className="text-foreground">Lender (giving money)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={form.role === "borrower"}
                  onChange={() => onChange({ ...form, role: "borrower" })}
                  className="mr-2"
                />
                <span className="text-foreground">Borrower (receiving money)</span>
              </label>
            </div>
          </div>

          {/* Partner Type */}
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-2">
              Other party is... *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={form.useExistingUser}
                  onChange={() => onChange({ ...form, useExistingUser: true })}
                  className="mr-2"
                />
                <span className="text-foreground">Registered user</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!form.useExistingUser}
                  onChange={() => onChange({ ...form, useExistingUser: false })}
                  className="mr-2"
                />
                <span className="text-foreground">External contact</span>
              </label>
            </div>
          </div>

          {/* Partner Selection */}
          {form.useExistingUser ? (
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Select User *
              </label>
              <select
                value={form.partnerId}
                onChange={(e) => onChange({ ...form, partnerId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              >
                <option value="">-- Select --</option>
                {counterpartOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName || user.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.partnerName}
                  onChange={(e) => onChange({ ...form, partnerName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={form.partnerEmail}
                  onChange={(e) => onChange({ ...form, partnerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  placeholder="john@example.com"
                />
              </div>
            </div>
          )}

          {/* Amount and Currency */}
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

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              Due Date (optional)
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => onChange({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
              placeholder="Loan purpose or notes..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Add Loan"}
          </button>
        </form>
      </div>
    </div>
  );
}
