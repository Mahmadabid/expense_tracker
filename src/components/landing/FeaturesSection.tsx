'use client';

import { FadeIn } from '@/components/ui/animated';
import { motion } from 'framer-motion';

const features = [
  {
    icon: '💰',
    title: 'Income Tracking',
    description: 'Monitor all your income sources with detailed categorization and insights.',
    color: 'from-green-500/20 to-emerald-500/20',
  },
  {
    icon: '📊',
    title: 'Expense Management',
    description: 'Track every expense and understand where your money goes.',
    color: 'from-red-500/20 to-pink-500/20',
  },
  {
    icon: '🤝',
    title: 'Loan Management',
    description: 'Keep track of loans with payment schedules and reminders.',
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    icon: '📈',
    title: 'Net Worth Calculator',
    description: 'Get a clear picture of your overall financial health instantly.',
    color: 'from-purple-500/20 to-indigo-500/20',
  },
  {
    icon: '🔒',
    title: 'Bank-Level Security',
    description: 'Your data is encrypted and protected with enterprise-grade security.',
    color: 'from-orange-500/20 to-amber-500/20',
  },
  {
    icon: '🌙',
    title: 'Beautiful Dark Mode',
    description: 'Seamlessly switch between light and dark themes for comfortable viewing.',
    color: 'from-slate-500/20 to-gray-500/20',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-32 bg-background border-y border-border/50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <FadeIn className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Everything you need to
            <span className="block gradient-text mt-2">manage your finances</span>
          </h2>
          <p className="text-xl sm:text-2xl text-foreground/70 max-w-3xl mx-auto leading-relaxed">
            Powerful features designed to make financial tracking effortless and insightful.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FadeIn key={index} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative p-10 rounded-3xl border border-border hover:border-accent/50 glass hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity -z-10`}></div>
                
                <div className="text-5xl mb-6">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">
                  {feature.title}
                </h3>
                <p className="text-foreground/70 text-base leading-relaxed">{feature.description}</p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
