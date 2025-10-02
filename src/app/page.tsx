'use client';

import { useAuth } from "@/context/AuthContext";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { LandingHero, FeaturesSection } from "@/components/landing";
import { FadeIn } from "@/components/ui/animated";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return (
    <main className="min-h-screen">
      <LandingHero />
      <FeaturesSection />
      
      {/* CTA Section */}
      <section className="py-32 bg-accent/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Ready to take control of your finances?
            </h2>
            <p className="text-xl text-foreground/70 mb-10">
              Start tracking your income, expenses, and loans with a modern, secure platform.
            </p>
            <a
              href="#auth"
              className="inline-block px-10 py-5 bg-accent text-white rounded-2xl font-semibold shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:scale-105 transition-all text-lg"
            >
              Get Started Free
            </a>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold gradient-text">Ledgerify</div>
              <span className="text-sm text-foreground/60">Modern Finance Tracker</span>
            </div>
            <div className="text-sm text-foreground/60">
              © 2024 Ledgerify. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
