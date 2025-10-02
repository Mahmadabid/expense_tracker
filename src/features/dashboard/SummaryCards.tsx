'use client';

import { useMemo } from "react";
import type { ExpenseRecord, IncomeRecord, LoanRecord } from "@/types";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function SummaryCards({
  expenses,
  income,
  loans,
  userId,
  currency,
  currencyOptions,
  onCurrencyChange,
}: {
  expenses: ExpenseRecord[];
  income: IncomeRecord[];
  loans: LoanRecord[];
  userId: string;
  currency: string;
  currencyOptions: readonly string[];
  onCurrencyChange: (currency: string) => void;
}) {
  const summary = useMemo(() => {
    const filteredExpenses = expenses.filter((e) => e.currency === currency);
    const filteredIncome = income.filter((i) => i.currency === currency);
    const filteredLoans = loans.filter((l) => l.currency === currency);

    const totalIncome = filteredIncome.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const activeLoans = filteredLoans.filter((l) => l.status !== "settled");
    const totalLent = activeLoans
      .filter((l) => l.lenderId === userId)
      .reduce((sum, l) => sum + (l.remainingAmount ?? l.amount), 0);
    const totalBorrowed = activeLoans
      .filter((l) => l.borrowerId === userId)
      .reduce((sum, l) => sum + (l.remainingAmount ?? l.amount), 0);

    const netWorth = totalIncome - totalExpenses + totalLent - totalBorrowed;

    return {
      totalIncome,
      totalExpenses,
      totalLent,
      totalBorrowed,
      netWorth,
      incomeCount: filteredIncome.length,
      expenseCount: filteredExpenses.length,
      loansLentCount: activeLoans.filter((l) => l.lenderId === userId).length,
      loansBorrowedCount: activeLoans.filter((l) => l.borrowerId === userId).length,
    };
  }, [currency, expenses, income, loans, userId]);

  const cards = [
    {
      label: "Net Worth",
      value: formatCurrency(summary.netWorth, currency),
      detail: `Income - Expenses ${summary.totalLent > 0 || summary.totalBorrowed > 0 ? '+ Loans' : ''}`,
      highlight: true,
    },
    {
      label: "Total Income",
      value: formatCurrency(summary.totalIncome, currency),
      detail: `${summary.incomeCount} income record${summary.incomeCount === 1 ? "" : "s"}`,
    },
    {
      label: "Total Expenses",
      value: formatCurrency(summary.totalExpenses, currency),
      detail: `${summary.expenseCount} expense${summary.expenseCount === 1 ? "" : "s"}`,
    },
    {
      label: "You've Lent",
      value: formatCurrency(summary.totalLent, currency),
      detail: `${summary.loansLentCount} active loan${summary.loansLentCount === 1 ? "" : "s"}`,
    },
    {
      label: "You Owe",
      value: formatCurrency(summary.totalBorrowed, currency),
      detail: `${summary.loansBorrowedCount} active loan${summary.loansBorrowedCount === 1 ? "" : "s"}`,
    },
  ];

  return (
    <section className="space-y-4">
      {/* Currency Selector */}
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Financial Overview</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Track your income, expenses, and loans in {currency}
            </p>
          </div>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-foreground/70">Currency</span>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {currencyOptions.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-4 transition-shadow hover:shadow-md ${
              card.highlight
                ? "bg-accent text-white border-accent"
                : "bg-background border-border"
            }`}
          >
            <p className={`text-xs uppercase tracking-wider ${card.highlight ? "text-white/70" : "text-foreground/60"}`}>
              {card.label}
            </p>
            <p className={`text-2xl font-bold mt-2 ${card.highlight ? "text-white" : "text-foreground"}`}>
              {card.value}
            </p>
            <p className={`text-sm mt-1 ${card.highlight ? "text-white/80" : "text-foreground/70"}`}>
              {card.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
