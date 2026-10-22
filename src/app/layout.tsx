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
      <body className="bg-[#FAF9F6] text-[#1C1C1C] min-h-screen flex flex-col selection:bg-[#795548]/20 selection:text-[#4E342E]">
        <AuthProvider>
          <Suspense fallback={<header className="h-20 bg-[#FAF9F6] border-b border-[#E8E1DA]" />}>
            <Navigation />
          </Suspense>
          <main className="flex-1">
            <Suspense fallback={<div className="p-8 text-center text-xs text-[#6B625D]">Loading experience...</div>}>
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
