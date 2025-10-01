'use client';

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useExpenses } from "@/hooks/useExpenses";
import { useLoans } from "@/hooks/useLoans";
import { useUsers, type UserRecord } from "@/hooks/useUsers";
import { createExpense, createLoan, settleLoan, deleteExpense, deleteLoan } from "@/lib/apiClient";
import type { ExpenseCategory, ExpenseRecord, LoanRecord } from "@/lib/models";
import {
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currencies";

const expenseCategories: ExpenseCategory[] = [
  "Food",
  "Transportation",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Education",
  "Other",
];

type LoanRole = "lender" | "borrower";
type TabType = "overview" | "add-expense" | "add-loan" | "history";
type TransactionFilter = "all" | "expenses" | "loans";

const currencyOptions = SUPPORTED_CURRENCIES;

function getCurrencyFromStorage(): SupportedCurrency {
  if (typeof window === "undefined") return "USD";
  const stored = localStorage.getItem("preferredCurrency");
  return isSupportedCurrency(stored) ? stored : "USD";
}

function setCurrencyToStorage(currency: SupportedCurrency) {
  if (typeof window !== "undefined") {
    localStorage.setItem("preferredCurrency", currency);
  }
}

type Transaction = {
  id: string;
  type: "expense" | "loan";
  amount: number;
  currency: string;
  description: string;
  category?: ExpenseCategory;
  date: Date;
  status?: string;
  counterparty?: string;
  role?: "lender" | "borrower"; // For loans: whether current user is lending or borrowing
};

export function Dashboard() {
  const { user, profile, signOutUser } = useAuth();
  const userId = user?.uid ?? null;

  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(getCurrencyFromStorage());
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("all");

  const {
    expenses,
    refresh: refreshExpenses,
  } = useExpenses(userId);
  const {
    loans,
    refresh: refreshLoans,
  } = useLoans(userId);
  const { users, loading: usersLoading } = useUsers();

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    currency: selectedCurrency,
    category: "Food" as ExpenseCategory,
    description: "",
  });

  const [loanForm, setLoanForm] = useState({
    role: "lender" as LoanRole,
    partnerId: "",
    partnerName: "",
    partnerEmail: "",
    useExistingUser: true,
    amount: "",
    currency: selectedCurrency,
    description: "",
    dueDate: "",
  });

  const [savingExpense, setSavingExpense] = useState(false);
  const [savingLoan, setSavingLoan] = useState(false);

  const counterpartOptions = useMemo<UserRecord[]>(
    () => users.filter((item: UserRecord) => item.id !== userId),
    [users, userId]
  );

  useEffect(() => {
    if (!loanForm.partnerId && counterpartOptions.length > 0) {
      setLoanForm((prev) => ({ ...prev, partnerId: counterpartOptions[0].id }));
    }
  }, [counterpartOptions, loanForm.partnerId]);

  useEffect(() => {
    setExpenseForm((prev) => ({ ...prev, currency: selectedCurrency }));
    setLoanForm((prev) => ({ ...prev, currency: selectedCurrency }));
    setCurrencyToStorage(selectedCurrency);
  }, [selectedCurrency]);

  const allTransactions = useMemo<Transaction[]>(() => {
    const expenseTransactions: Transaction[] = expenses.map((expense: ExpenseRecord) => ({
      id: expense.id,
      type: "expense" as const,
      amount: expense.amount,
      currency: expense.currency,
      description: expense.description,
      category: expense.category,
      date: expense.createdAt,
    }));

    const loanTransactions: Transaction[] = loans.map((loan: LoanRecord) => {
      const isLender = loan.lenderId === userId;
      const counterpartyId = isLender ? loan.borrowerId : loan.lenderId;
      
      let counterpartyName: string;
      if (counterpartyId === "EXTERNAL" && loan.externalParty) {
        counterpartyName = loan.externalParty.name;
      } else {
        const counterparty = users.find((u: UserRecord) => u.id === counterpartyId);
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

    return [...expenseTransactions, ...loanTransactions].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [expenses, loans, users, userId]);

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === "all") return allTransactions;
    return allTransactions.filter((t) => t.type === (transactionFilter === "expenses" ? "expense" : "loan"));
  }, [allTransactions, transactionFilter]);

  const totalExpenses = useMemo(
    () =>
      expenses
        .filter((e: ExpenseRecord) => e.currency === selectedCurrency)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, selectedCurrency]
  );

  const loansSummary = useMemo(() => {
    const lent = loans
      .filter((l: LoanRecord) => l.lenderId === userId && l.currency === selectedCurrency && l.status === "active")
      .reduce((sum, l) => sum + l.amount, 0);

    const borrowed = loans
      .filter((l: LoanRecord) => l.borrowerId === userId && l.currency === selectedCurrency && l.status === "active")
      .reduce((sum, l) => sum + l.amount, 0);

    return { lent, borrowed };
  }, [loans, userId, selectedCurrency]);

  const handleExpenseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const amount = parseFloat(expenseForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;

    try {
      setSavingExpense(true);
      await createExpense({
        userId,
        amount,
        currency: expenseForm.currency,
        category: expenseForm.category,
        description: expenseForm.description,
      });
      setExpenseForm({ amount: "", currency: selectedCurrency, category: "Food", description: "" });
      await refreshExpenses();
      setActiveTab("overview");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleLoanSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    // Validate based on whether using existing user or external party
    if (loanForm.useExistingUser && !loanForm.partnerId) return;
    if (!loanForm.useExistingUser && !loanForm.partnerName.trim()) return;

    const amount = parseFloat(loanForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;

    let lenderId: string;
    let borrowerId: string;
    let externalParty: { name: string; email?: string } | null = null;

    if (loanForm.useExistingUser) {
      // Both parties are registered users
      lenderId = loanForm.role === "lender" ? userId : loanForm.partnerId;
      borrowerId = loanForm.role === "lender" ? loanForm.partnerId : userId;
    } else {
      // One party is external (not registered)
      if (loanForm.role === "lender") {
        lenderId = userId;
        borrowerId = "EXTERNAL";
        externalParty = {
          name: loanForm.partnerName,
          email: loanForm.partnerEmail || undefined,
        };
      } else {
        lenderId = "EXTERNAL";
        borrowerId = userId;
        externalParty = {
          name: loanForm.partnerName,
          email: loanForm.partnerEmail || undefined,
        };
      }
    }

    try {
      setSavingLoan(true);
      await createLoan({
        lenderId,
        borrowerId,
        amount,
        currency: loanForm.currency,
        description: loanForm.description,
        dueDate: loanForm.dueDate ? new Date(loanForm.dueDate) : null,
        externalParty,
      });
      setLoanForm({
        role: loanForm.role,
        partnerId: "",
        partnerName: "",
        partnerEmail: "",
        useExistingUser: true,
        amount: "",
        currency: selectedCurrency,
        description: "",
        dueDate: "",
      });
      await refreshLoans();
      setActiveTab("overview");
    } finally {
      setSavingLoan(false);
    }
  };

  const handleSettleLoan = async (loanId: string) => {
    await settleLoan(loanId);
    await refreshLoans();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      await deleteExpense(expenseId);
      await refreshExpenses();
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (confirm("Are you sure you want to delete this loan?")) {
      await deleteLoan(loanId);
      await refreshLoans();
    }
  };

  const handleLogout = async () => {
    await signOutUser();
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
                <span className="text-xl font-bold text-white">₹</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Hi, {profile?.displayName?.split(" ")[0] ?? "there"}!
                </h1>
                <p className="text-sm text-gray-600">Manage your shared expenses</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as SupportedCurrency)}
                className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
              <button
                onClick={handleLogout}
                className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`cursor-pointer px-6 py-3 text-sm font-medium transition ${
              activeTab === "overview"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("add-expense")}
            className={`cursor-pointer px-6 py-3 text-sm font-medium transition ${
              activeTab === "add-expense"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ➕ Add Expense
          </button>
          <button
            onClick={() => setActiveTab("add-loan")}
            className={`cursor-pointer px-6 py-3 text-sm font-medium transition ${
              activeTab === "add-loan"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🤝 Add Loan
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`cursor-pointer px-6 py-3 text-sm font-medium transition ${
              activeTab === "history"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📜 History
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-600">Total Spent ({selectedCurrency})</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: selectedCurrency,
                  }).format(totalExpenses)}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-600">You Lent</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: selectedCurrency,
                  }).format(loansSummary.lent)}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-600">You Borrowed</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: selectedCurrency,
                  }).format(loansSummary.borrowed)}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setActiveTab("add-expense")}
                className="cursor-pointer flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg hover:shadow-xl transition"
              >
                <span>➕</span> Log New Expense
              </button>
              <button
                onClick={() => setActiveTab("add-loan")}
                className="cursor-pointer flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 text-lg font-semibold text-white shadow-lg hover:shadow-xl transition"
              >
                <span>🤝</span> Record Loan
              </button>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            transaction.type === "expense" ? "bg-blue-100" : "bg-purple-100"
                          }`}
                        >
                          <span className="text-lg">
                            {transaction.type === "expense" ? "💳" : "🤝"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description || transaction.category}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Intl.DateTimeFormat("en", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: transaction.currency,
                          }).format(transaction.amount)}
                        </p>
                        {transaction.type === "loan" && (
                          <p className="text-xs text-gray-600">{transaction.counterparty}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Expense Tab */}
        {activeTab === "add-expense" && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Log an Expense</h2>
              <form className="space-y-4" onSubmit={handleExpenseSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <input
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={expenseForm.currency}
                      onChange={(e) =>
                        setExpenseForm((prev) => ({ ...prev, currency: e.target.value as SupportedCurrency }))
                      }
                      className="cursor-pointer w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      {currencyOptions.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({ ...prev, category: e.target.value as ExpenseCategory }))
                    }
                    className="cursor-pointer w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none"
                    placeholder="What was this for?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingExpense || !expenseForm.amount}
                  className="cursor-pointer w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg hover:shadow-xl transition disabled:opacity-60"
                >
                  {savingExpense ? "Saving..." : "Save Expense"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Loan Tab */}
        {activeTab === "add-loan" && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Record a Loan</h2>
              <form className="space-y-4" onSubmit={handleLoanSubmit}>
                <div className="flex gap-4">
                  <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-300 bg-gray-50 px-4 py-3 hover:bg-gray-100">
                    <input
                      type="radio"
                      name="loanRole"
                      value="lender"
                      checked={loanForm.role === "lender"}
                      onChange={() => setLoanForm((prev) => ({ ...prev, role: "lender" }))}
                      className="h-5 w-5 cursor-pointer"
                    />
                    <span className="font-medium text-gray-900">I lent money</span>
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-300 bg-gray-50 px-4 py-3 hover:bg-gray-100">
                    <input
                      type="radio"
                      name="loanRole"
                      value="borrower"
                      checked={loanForm.role === "borrower"}
                      onChange={() => setLoanForm((prev) => ({ ...prev, role: "borrower" }))}
                      className="h-5 w-5 cursor-pointer"
                    />
                    <span className="font-medium text-gray-900">I borrowed money</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {loanForm.role === "lender" ? "Borrower" : "Lender"}
                  </label>
                  <div className="mb-3 flex gap-2">
                    <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50">
                      <input
                        type="radio"
                        checked={loanForm.useExistingUser}
                        onChange={() => setLoanForm((prev) => ({ ...prev, useExistingUser: true, partnerName: "", partnerEmail: "" }))}
                        className="h-4 w-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-900">Registered User</span>
                    </label>
                    <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50">
                      <input
                        type="radio"
                        checked={!loanForm.useExistingUser}
                        onChange={() => setLoanForm((prev) => ({ ...prev, useExistingUser: false, partnerId: "" }))}
                        className="h-4 w-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-900">Other Person</span>
                    </label>
                  </div>
                  {loanForm.useExistingUser ? (
                    <select
                      value={loanForm.partnerId}
                      onChange={(e) => setLoanForm((prev) => ({ ...prev, partnerId: e.target.value }))}
                      className="cursor-pointer w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                      required
                    >
                      <option value="" disabled>
                        {usersLoading ? "Loading..." : "Select a person"}
                      </option>
                      {counterpartOptions.map((person: UserRecord) => (
                        <option key={person.id} value={person.id}>
                          {person.displayName ?? person.email ?? "Unknown"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={loanForm.partnerName}
                        onChange={(e) => setLoanForm((prev) => ({ ...prev, partnerName: e.target.value }))}
                        placeholder="Person's name"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                        required={!loanForm.useExistingUser}
                      />
                      <input
                        type="email"
                        value={loanForm.partnerEmail}
                        onChange={(e) => setLoanForm((prev) => ({ ...prev, partnerEmail: e.target.value }))}
                        placeholder="Person's email (optional)"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-600">
                        💡 This person doesn&apos;t need to be registered on the platform
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <input
                      required
                      value={loanForm.amount}
                      onChange={(e) => setLoanForm((prev) => ({ ...prev, amount: e.target.value }))}
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={loanForm.currency}
                      onChange={(e) =>
                        setLoanForm((prev) => ({ ...prev, currency: e.target.value as SupportedCurrency }))
                      }
                      className="cursor-pointer w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                    >
                      {currencyOptions.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date (optional)
                  </label>
                  <input
                    value={loanForm.dueDate}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={loanForm.description}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                    placeholder="What was this loan for?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={
                    savingLoan || 
                    !loanForm.amount || 
                    (loanForm.useExistingUser && !loanForm.partnerId) ||
                    (!loanForm.useExistingUser && !loanForm.partnerName.trim())
                  }
                  className="cursor-pointer w-full rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 text-lg font-semibold text-white shadow-lg hover:shadow-xl transition disabled:opacity-60"
                >
                  {savingLoan ? "Saving..." : "Save Loan"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setTransactionFilter("all")}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition ${
                  transactionFilter === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTransactionFilter("expenses")}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition ${
                  transactionFilter === "expenses"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                Expenses Only
              </button>
              <button
                onClick={() => setTransactionFilter("loans")}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition ${
                  transactionFilter === "loans"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                Loans Only
              </button>
            </div>

            {/* Transaction List */}
            <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                All Transactions ({filteredTransactions.length})
              </h2>
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-gray-500 py-12">
                  No {transactionFilter !== "all" ? transactionFilter : "transactions"} found
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${
                            transaction.type === "expense" ? "bg-blue-100" : "bg-purple-100"
                          }`}
                        >
                          <span className="text-xl">
                            {transaction.type === "expense" ? "💳" : "🤝"}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {transaction.description || transaction.category || "Untitled"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Intl.DateTimeFormat("en", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(transaction.date)}
                          </p>
                          {transaction.type === "loan" && (
                            <p className="text-sm text-gray-600">
                              with {transaction.counterparty}
                              {transaction.status && (
                                <span
                                  className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    transaction.status === "settled"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-orange-100 text-orange-800"
                                  }`}
                                >
                                  {transaction.status}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: transaction.currency,
                          }).format(transaction.amount)}
                        </p>
                        <div className="mt-1 flex flex-col gap-1">
                          {transaction.type === "loan" && transaction.status !== "settled" && (
                            <button
                              onClick={() => handleSettleLoan(transaction.id)}
                              className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Mark as settled
                            </button>
                          )}
                          <button
                            onClick={() =>
                              transaction.type === "expense"
                                ? handleDeleteExpense(transaction.id)
                                : handleDeleteLoan(transaction.id)
                            }
                            className="cursor-pointer text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
