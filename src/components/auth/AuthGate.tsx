'use client';

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

function GoogleSignIn() {
  const { signInWithGoogle, authError } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleSignIn}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 text-base font-semibold text-slate-900 shadow-lg transition hover:shadow-xl hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {submitting ? "Signing in..." : "Sign in with Google"}
      </button>

      {authError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {authError}
        </p>
      )}
    </div>
  );
}

export function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
                  <span className="text-xl font-bold text-white">₹</span>
                </div>
                <span className="text-xl font-bold text-gray-900">FlowLedger</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left: Hero Content */}
            <div className="flex flex-col gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                ✨ Free to use
              </div>

              <div className="flex flex-col gap-6">
                <h1 className="text-4xl font-bold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
                  Split bills with roommates, friends & family
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Stop using messy spreadsheets or forgetting who paid for what. Track shared expenses, 
                  settle up easily, and keep everyone on the same page.
                </p>
              </div>

              {/* Sign In Card */}
              <div className="rounded-2xl bg-white p-8 shadow-xl border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Get started now</h2>
                <p className="text-gray-600 mb-6">
                  Sign in with your Google account to start tracking expenses with your group.
                </p>
                <GoogleSignIn />
                <p className="mt-4 text-xs text-gray-500">
                  Your data is encrypted and secure. We only use your name and email to personalize your experience.
                </p>
              </div>
            </div>

            {/* Right: Features */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Track every expense</h3>
                <p className="text-gray-600">
                  Log groceries, rent, utilities, trips—anything you share. Add notes and categories so you always know what&apos;s what.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Share with anyone</h3>
                <p className="text-gray-600">
                  Invite your roommates, travel buddies, or family members. Everyone sees the same balances in real-time.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Private & secure</h3>
                <p className="text-gray-600">
                  All your financial data is encrypted before it leaves your device. No one else can see your balances.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                  <span className="text-2xl">🌍</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Multiple currencies</h3>
                <p className="text-gray-600">
                  Use PKR, USD, EUR, or any other currency. Perfect for international trips or sending money across borders.
                </p>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 p-8 text-center">
            <p className="text-lg font-medium text-white/90 mb-2">Join thousands splitting expenses the easy way</p>
            <p className="text-3xl font-bold text-white">No more awkward money conversations</p>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
