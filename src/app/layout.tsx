import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { Header } from "@/components/layout/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ledgerify | Modern Finance Tracker",
  description: "Track income, expenses, and loans with a beautiful, intuitive interface. Built for modern financial management.",
  applicationName: "Ledgerify",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/ledgerify-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/ledgerify-maskable.svg" }],
    shortcut: [{ url: "/icons/ledgerify-icon.svg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <ServiceWorkerRegister />
            <Header />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
