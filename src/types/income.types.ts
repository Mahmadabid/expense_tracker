export type IncomeCategory =
  | "Salary"
  | "Freelance"
  | "Investment"
  | "Business"
  | "Gift"
  | "Other";

export type IncomeRecord = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: IncomeCategory;
  description: string;
  createdAt: Date;
};

export type EncryptedIncomeRecord = {
  id: string;
  userId: string;
  encryptedAmount: string;
  currency: string;
  category: IncomeCategory;
  encryptedDescription: string;
  createdAt: Date;
};
