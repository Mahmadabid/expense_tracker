'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExpenseRecord } from "@/lib/models";
import { parseExpense } from "@/lib/apiClient";
import { auth } from "@/lib/firebase";
async function loadExpenses(userId: string, signal?: AbortSignal): Promise<ExpenseRecord[]> {
  const user = auth.currentUser;
  if (!user) {
    // Return empty array if user is not ready yet instead of throwing
    return [];
  }

  const token = await user.getIdToken();
  const response = await fetch(`/api/expenses?userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
    signal,
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load expenses");
  }

  const payload = await response.json();
  return (payload.data as unknown[]).map((entry) => parseExpense(entry));
}

export function useExpenses(userId: string | null) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(async () => {
    if (!userId) {
      setExpenses([]);
      setError(null);
      setLoading(false);
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await loadExpenses(userId, controller.signal);
      setExpenses(data);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    runFetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [runFetch]);

  return {
    expenses,
    loading,
    error,
    refresh: runFetch,
  };
}
