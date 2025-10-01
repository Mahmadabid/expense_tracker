'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import type { LoanRecord } from "@/lib/models";
import { parseLoan } from "@/lib/apiClient";
import { auth } from "@/lib/firebase";
async function loadLoans(userId: string, signal?: AbortSignal): Promise<LoanRecord[]> {
  const user = auth.currentUser;
  if (!user) {
    // Return empty array if user is not ready yet instead of throwing
    return [];
  }

  const token = await user.getIdToken();
  const response = await fetch(`/api/loans?userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
    signal,
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load loans");
  }

  const payload = await response.json();
  return (payload.data as unknown[]).map((entry) => parseLoan(entry));
}

export function useLoans(userId: string | null) {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(async () => {
    if (!userId) {
      setLoans([]);
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
      const data = await loadLoans(userId, controller.signal);
      setLoans(data);
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
    loans,
    loading,
    error,
    refresh: runFetch,
  };
}
