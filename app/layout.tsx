import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; // Your new top header with Sign Out

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShiftPool",
  description: "Carpooling for shift workers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Navbar is here so it shows for EVERYONE (Driver & Passenger) */}
        <Navbar />

        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}