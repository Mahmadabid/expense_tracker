'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import type { IncomeRecord } from "@/types";
import { parseIncome } from "@/services/income.service";
import { auth } from "@/lib/firebase";

async function loadIncome(userId: string, signal?: AbortSignal): Promise<IncomeRecord[]> {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  const token = await user.getIdToken();
  const response = await fetch(`/api/income?userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
    signal,
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load income");
  }

  const payload = await response.json();
  return (payload.data as unknown[]).map((entry) => parseIncome(entry));
}

export function useIncome(userId: string | null) {
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(async () => {
    if (!userId) {
      setIncome([]);
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
      const data = await loadIncome(userId, controller.signal);
      setIncome(data);
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
    income,
    loading,
    error,
    refresh: runFetch,
  };
}
