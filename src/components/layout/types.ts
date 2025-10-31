// Shared types and constants for MainContent and related components

export const SUPPORTED_CURRENCIES = ['PKR', 'KWD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD', 'JPY'] as const;
export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'];

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    totalLoaned: number;
    totalBorrowed: number;
    netLoan: number;
  };
  recentEntries?: any[];
  recentLoans?: any[];
  entries?: any[];
  loans?: any[];
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
}

export interface EntryCardProps {
  entry: any;
  onUpdate: () => void;
  addToast: any;
}

export interface LoanCardProps {
  loan: any;
  onUpdate: () => void;
  onOptimisticLoanUpdate?: (updated: any) => void;
  currentUserId: string;
  addToast: any;
}
