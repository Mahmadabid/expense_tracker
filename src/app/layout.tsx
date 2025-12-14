import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ThemeProvider } from '@/lib/theme/ThemeContext';
import { ToastProvider, Toaster } from '@/components/ui/Toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '💰 Expense & Loan Tracker',
  description: 'Track your expenses, income, and loans with collaborative features',
  keywords: ['expense tracker', 'loan tracker', 'finance', 'money management', 'pwa', 'progressive web app'],
  authors: [{ name: 'Expense Tracker Team' }],
  manifest: '/manifest.json?v=6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Expense Tracker',
  },
  robots: 'index, follow',
  icons: {
    icon: [
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
    ],
  },
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/logo.png" type="image/png" sizes="32x32" />
        
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json?v=6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Expense Tracker" />
        <meta name="application-name" content="Expense Tracker" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <div id="root" className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
                {children}
              </div>
              <Toaster />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}