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

export type LoanStatus = "pending" | "active" | "settled";

export type LoanRecord = {
  id: string;
  lenderId: string;
  borrowerId: string;
  amount: number;
  currency: string;
  description: string;
  status: LoanStatus;
  createdAt: Date;
  dueDate?: Date | null;
  externalParty?: { name: string; email?: string } | null;
};
