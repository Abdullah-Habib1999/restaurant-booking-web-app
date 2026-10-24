import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";

import { Suspense } from "react";

export const metadata: Metadata = {
  title: "TableReserve | Multi-Restaurant Reservation & Pre-Ordering Platform",
  description: "Reserve your table and pre-order your favorite culinary dishes before arrival. Zero wait times, transparent seating capacity, and effortless dining.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0B0B0B] text-[#F5F0E9] min-h-screen flex flex-col selection:bg-[#8B5E45]/40 selection:text-[#F5F0E9]">
        <AuthProvider>
          <Suspense fallback={<header className="h-20 bg-[#0B0B0B] border-b border-[#332A25]" />}>
            <Navigation />
          </Suspense>
          <main className="flex-1">
            <Suspense fallback={<div className="p-8 text-center text-xs text-[#8D8178]">Loading experience...</div>}>
              {children}
            </Suspense>
          </main>
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
