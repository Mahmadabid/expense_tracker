export type LoanStatus = "pending" | "active" | "settled";

export type LoanPayment = {
  id: string;
  amount: number;
  date: Date;
  note?: string;
};

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
  payments?: LoanPayment[];
  remainingAmount?: number;
};

export type EncryptedLoanRecord = {
  id: string;
  lenderId: string;
  borrowerId: string;
  encryptedAmount: string;
  currency: string;
  encryptedDescription: string;
  status: LoanStatus;
  createdAt: Date;
  dueDate?: Date | null;
  externalParty?: { encryptedName: string; encryptedEmail?: string } | null;
  payments?: { id: string; encryptedAmount: string; date: Date; encryptedNote?: string }[];
  encryptedRemainingAmount?: string;
};
