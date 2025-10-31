export const SUPPORTED_CURRENCIES = ['PKR', 'KWD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD', 'JPY'] as const;

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Education',
  'Other'
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Gift',
  'Other'
];

export type Currency = typeof SUPPORTED_CURRENCIES[number];
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export type IncomeCategory = typeof INCOME_CATEGORIES[number];
