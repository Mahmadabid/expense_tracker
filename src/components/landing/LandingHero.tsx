'use client';

import { motion } from 'framer-motion';
import { Card3D, FadeIn, Floating } from '@/components/ui/animated';

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-32">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Content */}
          <div className="space-y-10">
            <FadeIn delay={0.1}>
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-accent/10 border border-accent/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                <span className="text-sm font-semibold text-accent tracking-wide">Modern Finance Tracking</span>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.1]">
                Track your
                <span className="block gradient-text mt-2">finances with style</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.3}>
              <p className="text-xl sm:text-2xl text-foreground/70 leading-relaxed max-w-xl">
                Ledgerify helps you manage income, expenses, and loans with a beautiful,
                intuitive interface. Built for modern financial management.
              </p>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="flex flex-wrap gap-5 pt-4">
                <motion.a
                  href="#auth"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-5 bg-accent text-white rounded-2xl font-semibold shadow-lg shadow-accent/20 hover:shadow-2xl hover:shadow-accent/40 transition-all text-lg"
                >
                  Get Started Free
                </motion.a>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-5 glass border border-border rounded-2xl font-semibold hover:border-accent/50 transition-all text-lg"
                >
                  Learn More
                </motion.button>
              </div>
            </FadeIn>

            <FadeIn delay={0.5}>
              <div className="flex flex-wrap items-center gap-6 pt-8 border-t border-border/50">
                <div className="flex items-center gap-2.5 text-sm text-foreground/70">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Free to use</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-foreground/70">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Secure encryption</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-foreground/70">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Open source</span>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Right: 3D Cards */}
          <div className="relative h-[700px] hidden lg:block">
            <Floating delay={0}>
              <Card3D className="absolute top-0 right-0 w-[340px]">
                <div className="glass rounded-3xl p-8 shadow-2xl border border-border/50">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Net Worth</span>
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-5xl font-bold gradient-text mb-3">$45,280</div>
                  <div className="text-sm font-medium text-green-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    12.5% this month
                  </div>
                </div>
              </Card3D>
            </Floating>

            <Floating delay={0.5}>
              <Card3D className="absolute top-48 right-24 w-[320px]">
                <div className="glass rounded-3xl p-8 shadow-2xl border border-border/50 bg-accent/5">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center">
                      <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Monthly Income</div>
                      <div className="text-3xl font-bold mt-1">$8,450</div>
                    </div>
                  </div>
                  <div className="h-24 flex items-end gap-1.5">
                    {[40, 60, 45, 80, 65, 90, 70].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: i * 0.1 + 1, duration: 0.5 }}
                        className="flex-1 bg-accent/40 rounded-t-lg"
                      />
                    ))}
                  </div>
                </div>
              </Card3D>
            </Floating>

            <Floating delay={1}>
              <Card3D className="absolute bottom-24 right-48 w-[300px]">
                <div className="glass rounded-3xl p-7 shadow-2xl border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
                      💼
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold">Loan Payment</div>
                      <div className="text-sm text-foreground/60">Due in 5 days</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-4">$1,200</div>
                  <div className="relative h-2.5 bg-foreground/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '60%' }}
                      transition={{ delay: 1.5, duration: 1 }}
                      className="absolute h-full bg-gradient-to-r from-accent to-accent/70 rounded-full"
                    />
                  </div>
                  <div className="text-xs text-foreground/60 mt-2">60% paid</div>
                </div>
              </Card3D>
            </Floating>
          </div>
        </div>
      </div>
    </section>
  );
}
