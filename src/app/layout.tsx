import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Expense & Loan Tracker',
  description: 'Track your expenses, income, and loans with collaborative features',
  keywords: ['expense tracker', 'loan tracker', 'finance', 'money management'],
  authors: [{ name: 'Expense Tracker Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <div id="root" className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
          {children}
        </div>
      </body>
    </html>
  );
}