'use client';

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card3D } from "@/components/ui/animated";
import type { ExpenseRecord, LoanRecord } from "@/lib/models";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

const cardIcons = {
  spent: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  lent: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  owe: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  net: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

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
  currencyOptions: readonly string[];
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
      label: "Total Spent",
      value: formatCurrency(summary.totalSpent, currency),
      detail: `${summary.expenseCount} expense${summary.expenseCount === 1 ? "" : "s"}`,
      icon: cardIcons.spent,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      label: "You've Lent",
      value: formatCurrency(summary.totalLent, currency),
      detail: `${summary.activeCount} active loan${summary.activeCount === 1 ? "" : "s"}`,
      icon: cardIcons.lent,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "You Owe",
      value: formatCurrency(summary.totalBorrowed, currency),
      detail: `${summary.settledCount} settled loan${summary.settledCount === 1 ? "" : "s"}`,
      icon: cardIcons.owe,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Net Position",
      value: formatCurrency(summary.netPosition, currency),
      detail: summary.netPosition >= 0 ? "You're in the green" : "Time to settle some loans",
      icon: cardIcons.net,
      color: summary.netPosition >= 0 ? "text-green-400" : "text-red-400",
      bgColor: summary.netPosition >= 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <section className="space-y-6">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass card-elevated rounded-2xl p-6 border border-border"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/50 font-medium">
              Financial Overview
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Balances in <span className="gradient-text">{currency}</span>
            </h2>
            <p className="text-sm text-foreground/60 mt-1">
              Track your spending, lending, and borrowing across all currencies
            </p>
          </div>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-foreground/70 font-medium">Display Currency</span>
            <select
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
            >
              {currencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </motion.div>

      {/* Summary Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <Card3D key={item.label} intensity={0.3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass card-elevated rounded-2xl p-6 border border-border h-full group hover:border-accent/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${item.bgColor}`}>
                  <div className={item.color}>{item.icon}</div>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground/70 uppercase tracking-wider">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-bold">{item.value}</p>
              <p className="mt-2 text-sm text-foreground/60">{item.detail}</p>
            </motion.div>
          </Card3D>
        ))}
      </div>
    </section>
  );
}
