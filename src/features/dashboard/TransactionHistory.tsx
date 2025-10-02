'use client';

import { useMemo, useState } from "react";
import type { ExpenseRecord, IncomeRecord, LoanRecord, UserRecord } from "@/types";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

type Transaction = {
  id: string;
  type: "expense" | "income" | "loan";
  amount: number;
  currency: string;
  description: string;
  date: Date;
  category?: string;
  status?: string;
  counterparty?: string;
  role?: "lender" | "borrower";
};

export function TransactionHistory({
  expenses,
  income,
  loans,
  userId,
  users,
  onDeleteExpense,
  onDeleteIncome,
  onDeleteLoan,
  onSettleLoan,
}: {
  expenses: ExpenseRecord[];
  income: IncomeRecord[];
  loans: LoanRecord[];
  userId: string;
  users: UserRecord[];
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteLoan: (id: string) => void;
  onSettleLoan: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "expense" | "income" | "loan">("all");

  const allTransactions = useMemo<Transaction[]>(() => {
    const expenseTransactions: Transaction[] = expenses.map((expense) => ({
      id: expense.id,
      type: "expense" as const,
      amount: expense.amount,
      currency: expense.currency,
      description: expense.description,
      category: expense.category,
      date: expense.createdAt,
    }));

    const incomeTransactions: Transaction[] = income.map((inc) => ({
      id: inc.id,
      type: "income" as const,
      amount: inc.amount,
      currency: inc.currency,
      description: inc.description,
      category: inc.category,
      date: inc.createdAt,
    }));

    const loanTransactions: Transaction[] = loans.map((loan) => {
      const isLender = loan.lenderId === userId;
      const counterpartyId = isLender ? loan.borrowerId : loan.lenderId;

      let counterpartyName: string;
      if (counterpartyId === "EXTERNAL" && loan.externalParty) {
        counterpartyName = loan.externalParty.name;
      } else {
        const counterparty = users.find((u) => u.id === counterpartyId);
        counterpartyName = counterparty?.displayName ?? counterparty?.email ?? "Unknown";
      }

      return {
        id: loan.id,
        type: "loan" as const,
        amount: loan.amount,
        currency: loan.currency,
        description: loan.description,
        date: loan.createdAt,
        status: loan.status,
        counterparty: counterpartyName,
        role: isLender ? "lender" : "borrower",
      };
    });

    return [...expenseTransactions, ...incomeTransactions, ...loanTransactions].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [expenses, income, loans, users, userId]);

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return allTransactions;
    return allTransactions.filter((t) => t.type === filter);
  }, [allTransactions, filter]);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "expense", label: "Expenses" },
            { id: "income", label: "Income" },
            { id: "loan", label: "Loans" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === tab.id
                  ? "bg-accent text-white"
                  : "bg-atmosphere dark:bg-graphite text-foreground hover:bg-accent/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-background border border-border rounded-lg p-8 text-center">
            <p className="text-foreground/60">No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <div
              key={`${transaction.type}-${transaction.id}`}
              className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                        transaction.type === "income"
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                          : transaction.type === "expense"
                          ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100"
                          : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
                      }`}
                    >
                      {transaction.type.toUpperCase()}
                    </span>
                    {transaction.category && (
                      <span className="text-sm text-foreground/60">{transaction.category}</span>
                    )}
                    {transaction.status && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          transaction.status === "settled"
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    )}
                  </div>
                  <p className="text-foreground font-medium truncate">{transaction.description || "No description"}</p>
                  {transaction.counterparty && (
                    <p className="text-sm text-foreground/60">
                      {transaction.role === "lender" ? "Lent to: " : "Borrowed from: "}
                      {transaction.counterparty}
                    </p>
                  )}
                  <p className="text-xs text-foreground/50 mt-1">{formatDate(transaction.date)}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      transaction.type === "income"
                        ? "text-green-600 dark:text-green-400"
                        : transaction.type === "expense"
                        ? "text-red-600 dark:text-red-400"
                        : "text-foreground"
                    }`}>
                      {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {transaction.type === "loan" && transaction.status === "active" && (
                      <button
                        onClick={() => onSettleLoan(transaction.id)}
                        className="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
                      >
                        Settle
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (transaction.type === "expense") onDeleteExpense(transaction.id);
                        else if (transaction.type === "income") onDeleteIncome(transaction.id);
                        else onDeleteLoan(transaction.id);
                      }}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
