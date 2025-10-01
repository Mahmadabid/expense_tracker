'use client';

import { useMemo } from "react";
import { MotionCard } from "@/components/ui/MotionCard";
import type { ExpenseRecord, LoanRecord } from "@/lib/models";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function SummaryCards({
  expenses,
  loans,
  userId,
  currency,
  currencyOptions,
  onCurrencyChange,
}: {
  expenses: ExpenseRecord[];
  loans: LoanRecord[];
  userId: string;
  currency: string;
  currencyOptions: string[];
  onCurrencyChange: (currency: string) => void;
}) {
  const summary = useMemo(() => {
    const expensesByCurrency = expenses.filter((expense) => expense.currency === currency);
    const loansByCurrency = loans.filter((loan) => loan.currency === currency);

    const totalSpent = expensesByCurrency.reduce((acc, expense) => acc + expense.amount, 0);
    const activeLoans = loansByCurrency.filter((loan) => loan.status !== "settled");
    const totalLent = activeLoans
      .filter((loan) => loan.lenderId === userId)
      .reduce((acc, loan) => acc + loan.amount, 0);
    const totalBorrowed = activeLoans
      .filter((loan) => loan.borrowerId === userId)
      .reduce((acc, loan) => acc + loan.amount, 0);
    const netPosition = totalLent - totalBorrowed;

    return {
      totalSpent,
      totalLent,
      totalBorrowed,
      netPosition,
      settledCount: loansByCurrency.filter((loan) => loan.status === "settled").length,
      activeCount: activeLoans.length,
      expenseCount: expensesByCurrency.length,
    };
  }, [currency, expenses, loans, userId]);

  const items = [
    {
      label: "Total spent",
      value: formatCurrency(summary.totalSpent, currency),
      detail: `${summary.expenseCount} expense${summary.expenseCount === 1 ? "" : "s"}`,
    },
    {
      label: "You've lent",
      value: formatCurrency(summary.totalLent, currency),
      detail: `${summary.activeCount} active loan${summary.activeCount === 1 ? "" : "s"}`,
    },
    {
      label: "You owe",
      value: formatCurrency(summary.totalBorrowed, currency),
      detail: `${summary.settledCount} settled loan${summary.settledCount === 1 ? "" : "s"}`,
    },
    {
      label: "Net position",
      value: formatCurrency(summary.netPosition, currency),
      detail:
        summary.netPosition >= 0 ? "You're in the green" : "Time to settle some loans",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MotionCard className="p-6 text-white/90 sm:col-span-2 xl:col-span-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Overview</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Balances in {currency}
            </h2>
            <p className="text-sm text-white/60">
              Switch currency to explore how your spending, lending, and borrowing compare.
            </p>
          </div>
          <label className="flex flex-col gap-2 text-sm text-white/70">
            <span>Display currency</span>
            <select
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
            >
              {currencyOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-900">
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </MotionCard>

      {items.map((item) => (
        <MotionCard key={item.label} className="p-6 text-white/90">
          <p className="text-sm font-medium text-white/70 uppercase tracking-wider">
            {item.label}
          </p>
          <p className="mt-4 text-3xl font-semibold">{item.value}</p>
          <p className="mt-2 text-sm text-white/60">{item.detail}</p>
        </MotionCard>
      ))}
    </section>
  );
}
