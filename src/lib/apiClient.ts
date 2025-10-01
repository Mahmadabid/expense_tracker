import type { ExpenseCategory, ExpenseRecord, LoanRecord } from "@/lib/models";
import { auth } from "@/lib/firebase";

/**
 * Get authentication headers with Firebase JWT token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function ensureOk(response: Response) {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response;
}

type ExpensePayload = {
  id: string;
  userId: string;
  amount: number | string;
  currency?: string | null;
  category: ExpenseCategory;
  description: string;
  createdAt: string;
};

function isExpensePayload(value: unknown): value is ExpensePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<ExpensePayload>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.userId === "string" &&
    (typeof candidate.amount === "number" || typeof candidate.amount === "string") &&
    typeof candidate.category === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.createdAt === "string"
  );
}

export function parseExpense(raw: unknown): ExpenseRecord {
  if (!isExpensePayload(raw)) {
    throw new Error("Invalid expense payload received");
  }

  return {
    id: raw.id,
    userId: raw.userId,
    amount: Number(raw.amount),
    currency: raw.currency ?? "USD",
    category: raw.category,
    description: raw.description,
    createdAt: new Date(raw.createdAt),
  } satisfies ExpenseRecord;
}

type LoanPayload = {
  id: string;
  lenderId: string;
  borrowerId: string;
  amount: number | string;
  currency?: string | null;
  description: string;
  status: LoanRecord["status"];
  createdAt: string;
  dueDate?: string | null;
  externalParty?: { name: string; email?: string } | null;
};

function isLoanPayload(value: unknown): value is LoanPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<LoanPayload>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.lenderId === "string" &&
    typeof candidate.borrowerId === "string" &&
    (typeof candidate.amount === "number" || typeof candidate.amount === "string") &&
    typeof candidate.description === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.createdAt === "string"
  );
}

export function parseLoan(raw: unknown): LoanRecord {
  if (!isLoanPayload(raw)) {
    throw new Error("Invalid loan payload received");
  }

  return {
    id: raw.id,
    lenderId: raw.lenderId,
    borrowerId: raw.borrowerId,
    amount: Number(raw.amount),
    currency: raw.currency ?? "USD",
    description: raw.description,
    status: raw.status,
    createdAt: new Date(raw.createdAt),
    dueDate: raw.dueDate ? new Date(raw.dueDate) : null,
    externalParty: raw.externalParty ?? null,
  } satisfies LoanRecord;
}

export type ExpenseInput = {
  userId: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
};

type ListResponse<T> = {
  data: T;
};

export async function createExpense(payload: ExpenseInput) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/expenses", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  ensureOk(response);
  const data = (await response.json()) as ListResponse<unknown>;
  return parseExpense(data.data);
}

export async function getExpenses(userId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/expenses?userId=${encodeURIComponent(userId)}`,
    { headers }
  );
  ensureOk(response);
  const data = (await response.json()) as ListResponse<unknown>;
  if (!Array.isArray(data.data)) {
    throw new Error("Invalid expenses response");
  }
  return data.data.map((entry) => parseExpense(entry));
}

export type LoanInput = {
  lenderId: string;
  borrowerId: string;
  amount: number;
  currency: string;
  description: string;
  dueDate?: Date | null;
  externalParty?: { name: string; email?: string } | null;
};

export async function createLoan(payload: LoanInput) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/loans", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      dueDate: payload.dueDate?.toISOString() ?? null,
      currency: payload.currency,
      externalParty: payload.externalParty ?? null,
    }),
  });
  ensureOk(response);
  const data = (await response.json()) as ListResponse<unknown>;
  return parseLoan(data.data);
}

export async function getLoans(userId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/loans?userId=${encodeURIComponent(userId)}`,
    { headers }
  );
  ensureOk(response);
  const data = (await response.json()) as ListResponse<unknown>;
  if (!Array.isArray(data.data)) {
    throw new Error("Invalid loans response");
  }
  return data.data.map((entry) => parseLoan(entry));
}

export async function settleLoan(loanId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/loans/${loanId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "settled" }),
  });
  ensureOk(response);
  const data = (await response.json()) as ListResponse<unknown>;
  return parseLoan(data.data);
}

export async function deleteExpense(expenseId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/expenses/${expenseId}`, {
    method: "DELETE",
    headers,
  });
  ensureOk(response);
  return response.json();
}

export async function deleteLoan(loanId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/loans/${loanId}`, {
    method: "DELETE",
    headers,
  });
  ensureOk(response);
  return response.json();
}
