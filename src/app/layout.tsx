import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowLedger | Collaborative Expense & Loan Tracker",
  description: "Track personal spending, shared expenses, and inter-user loans with Firebase-authenticated dashboards.",
  applicationName: "FlowLedger",
  manifest: "/manifest.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  icons: {
    icon: [{ url: "/icons/flowledger-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/flowledger-icon.svg" }],
    shortcut: [{ url: "/icons/flowledger-icon.svg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ServiceWorkerRegister />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
