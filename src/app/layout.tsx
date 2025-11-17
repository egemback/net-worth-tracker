import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MonthSelector from "@/components/MonthSelector";
import ToastHub from "@/components/ToastHub";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Net Worth Tracker",
  description:
    "Track your assets, liabilities, and net worth with forecasting and scenarios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        <div className="mx-auto max-w-7xl p-6 space-y-6">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
              Net Worth Tracker
            </h1>
            <nav className="text-sm text-gray-800 space-x-4">
              <a href="/dashboard" className="hover:underline">
                Dashboard
              </a>
              <a href="/assets" className="hover:underline">
                Assets
              </a>
              <a href="/liabilities" className="hover:underline">
                Liabilities
              </a>
              <a href="/goals" className="hover:underline">
                Goals
              </a>
              <a href="/budget" className="hover:underline">
                Budget
              </a>
              <a href="/scenarios" className="hover:underline">
                Scenarios
              </a>
              <a href="/stock-analysis" className="hover:underline">
                Stock Analysis
              </a>
            </nav>
          </header>
          <MonthSelector />
          {children}
          <ToastHub />
        </div>
      </body>
    </html>
  );
}
