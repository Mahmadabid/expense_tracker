import type { IncomeCategory, IncomeRecord } from "@/types";
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

type IncomePayload = {
  id: string;
  userId: string;
  amount: number | string;
  currency?: string | null;
  category: IncomeCategory;
  description: string;
  createdAt: string;
};

function isIncomePayload(value: unknown): value is IncomePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<IncomePayload>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.userId === "string" &&
    (typeof candidate.amount === "number" || typeof candidate.amount === "string") &&
    typeof candidate.category === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.createdAt === "string"
  );
}

export function parseIncome(raw: unknown): IncomeRecord {
  if (!isIncomePayload(raw)) {
    throw new Error("Invalid income payload received");
  }

  return {
    id: raw.id,
    userId: raw.userId,
    amount: Number(raw.amount),
    currency: raw.currency ?? "USD",
    category: raw.category,
    description: raw.description,
    createdAt: new Date(raw.createdAt),
  } satisfies IncomeRecord;
}

export type IncomeInput = {
  userId: string;
  amount: number;
  currency: string;
  category: IncomeCategory;
  description: string;
};

type ListResponse<T> = {
  data: T;
};

export async function createIncome(payload: IncomeInput) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/income", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  ensureOk(response);
  const data = (await response.json()) as ListResponse<unknown>;
  return parseIncome(data.data);
}

export async function getIncome(userId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/income?userId=${encodeURIComponent(userId)}`,
    { headers }
  );
  ensureOk(response);
  const data = (await response.json()) as ListResponse<unknown>;
  if (!Array.isArray(data.data)) {
    throw new Error("Invalid income response");
  }
  return data.data.map((entry) => parseIncome(entry));
}

export async function deleteIncome(incomeId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/income/${incomeId}`, {
    method: "DELETE",
    headers,
  });
  ensureOk(response);
  return response.json();
}
