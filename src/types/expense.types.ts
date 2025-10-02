export type ExpenseCategory =
  | "Housing"
  | "Utilities"
  | "Food"
  | "Transportation"
  | "Entertainment"
  | "Health"
  | "Education"
  | "Other";

export type ExpenseRecord = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  createdAt: Date;
};

export type EncryptedExpenseRecord = {
  id: string;
  userId: string;
  encryptedAmount: string;
  currency: string;
  category: ExpenseCategory;
  encryptedDescription: string;
  createdAt: Date;
};
