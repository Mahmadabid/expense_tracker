'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
export type UserRecord = {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastSeen: Date | null;
};

async function loadUsers(signal?: AbortSignal): Promise<UserRecord[]> {
  const user = auth.currentUser;
  if (!user) {
    // Return empty array if user is not ready yet instead of throwing
    return [];
  }

  const token = await user.getIdToken();
  const response = await fetch("/api/users", {
    cache: "no-store",
    signal,
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load users");
  }

  const payload = await response.json();
  return (payload.data as Array<{
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  }>)
    .map<UserRecord>((user) => ({
      ...user,
      lastSeen: user.lastSeen ? new Date(user.lastSeen) : null,
    }))
    .sort((a, b) => {
      const aName = (a.displayName || a.email || "").toLowerCase();
      const bName = (b.displayName || b.email || "").toLowerCase();
      return aName.localeCompare(bName);
    });
}

export function useUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await loadUsers(controller.signal);
      setUsers(data);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runFetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [runFetch]);

  return {
    users,
    loading,
    error,
    refresh: runFetch,
  };
}
