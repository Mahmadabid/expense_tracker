'use client';

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useExpenses } from "@/hooks/useExpenses";
import { useLoans } from "@/hooks/useLoans";
import { useIncome } from "@/features/income/useIncome.hook";
import { useUsers, type UserRecord } from "@/hooks/useUsers";
import { createExpense, createLoan, settleLoan, deleteExpense, deleteLoan } from "@/lib/apiClient";
import { createIncome, deleteIncome } from "@/services/income.service";
import type { ExpenseCategory, IncomeCategory, ExpenseRecord, LoanRecord, IncomeRecord } from "@/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SUPPORTED_CURRENCIES, getCurrencyFromStorage, setCurrencyToStorage, type SupportedCurrency, isSupportedCurrency } from "@/constants";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ExpenseForm } from "./ExpenseForm";
import { IncomeForm } from "./IncomeForm";
import { LoanForm } from "./LoanForm";
import { TransactionHistory } from "./TransactionHistory";

type LoanRole = "lender" | "borrower";
type TabType = "overview" | "add-expense" | "add-income" | "add-loan" | "history";

export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(getCurrencyFromStorage());
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const { expenses, refresh: refreshExpenses } = useExpenses(userId);
  const { income, refresh: refreshIncome } = useIncome(userId);
  const { loans, refresh: refreshLoans } = useLoans(userId);
  const { users } = useUsers();

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    currency: selectedCurrency,
    category: "Food" as ExpenseCategory,
    description: "",
  });

  const [incomeForm, setIncomeForm] = useState({
    amount: "",
    currency: selectedCurrency,
    category: "Salary" as IncomeCategory,
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
  const [savingIncome, setSavingIncome] = useState(false);
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
    setIncomeForm((prev) => ({ ...prev, currency: selectedCurrency }));
    setLoanForm((prev) => ({ ...prev, currency: selectedCurrency }));
    setCurrencyToStorage(selectedCurrency);
  }, [selectedCurrency]);

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

  const handleIncomeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const amount = parseFloat(incomeForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;

    try {
      setSavingIncome(true);
      await createIncome({
        userId,
        amount,
        currency: incomeForm.currency,
        category: incomeForm.category,
        description: incomeForm.description,
      });
      setIncomeForm({ amount: "", currency: selectedCurrency, category: "Salary", description: "" });
      await refreshIncome();
      setActiveTab("overview");
    } finally {
      setSavingIncome(false);
    }
  };

  const handleLoanSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    if (loanForm.useExistingUser && !loanForm.partnerId) return;
    if (!loanForm.useExistingUser && !loanForm.partnerName.trim()) return;

    const amount = parseFloat(loanForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;

    let lenderId: string;
    let borrowerId: string;
    let externalParty: { name: string; email?: string } | null = null;

    if (loanForm.useExistingUser) {
      lenderId = loanForm.role === "lender" ? userId : loanForm.partnerId;
      borrowerId = loanForm.role === "lender" ? loanForm.partnerId : userId;
    } else {
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

  const handleDeleteIncome = async (incomeId: string) => {
    if (confirm("Are you sure you want to delete this income?")) {
      await deleteIncome(incomeId);
      await refreshIncome();
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (confirm("Are you sure you want to delete this loan?")) {
      await deleteLoan(loanId);
      await refreshLoans();
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tabs */}
        <nav className="flex flex-wrap gap-2 mb-6" role="tablist">
          {[
            { id: "overview", label: "Overview" },
            { id: "add-expense", label: "+ Expense" },
            { id: "add-income", label: "+ Income" },
            { id: "add-loan", label: "+ Loan" },
            { id: "history", label: "History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-accent text-white"
                  : "bg-atmosphere dark:bg-graphite text-foreground hover:bg-accent/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <SummaryCards
            expenses={expenses}
            income={income}
            loans={loans}
            userId={userId}
            currency={selectedCurrency}
            currencyOptions={SUPPORTED_CURRENCIES}
            onCurrencyChange={(cur: string) => setSelectedCurrency(cur as SupportedCurrency)}
          />
        )}

        {activeTab === "add-expense" && (
          <ExpenseForm
            form={expenseForm}
            onChange={setExpenseForm}
            onSubmit={handleExpenseSubmit}
            saving={savingExpense}
            categories={EXPENSE_CATEGORIES}
            currencies={SUPPORTED_CURRENCIES}
          />
        )}

        {activeTab === "add-income" && (
          <IncomeForm
            form={incomeForm}
            onChange={setIncomeForm}
            onSubmit={handleIncomeSubmit}
            saving={savingIncome}
            categories={INCOME_CATEGORIES}
            currencies={SUPPORTED_CURRENCIES}
          />
        )}

        {activeTab === "add-loan" && (
          <LoanForm
            form={loanForm}
            onChange={setLoanForm}
            onSubmit={handleLoanSubmit}
            saving={savingLoan}
            currencies={SUPPORTED_CURRENCIES}
            counterpartOptions={counterpartOptions}
          />
        )}

        {activeTab === "history" && (
          <TransactionHistory
            expenses={expenses}
            income={income}
            loans={loans}
            userId={userId}
            users={users}
            onDeleteExpense={handleDeleteExpense}
            onDeleteIncome={handleDeleteIncome}
            onDeleteLoan={handleDeleteLoan}
            onSettleLoan={handleSettleLoan}
          />
        )}
      </div>
    </div>
  );
}
