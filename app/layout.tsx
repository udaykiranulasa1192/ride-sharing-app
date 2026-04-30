import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DriverNav from "@/components/DriverNav";

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
        {/* The main content of your pages */}
        <div className="min-h-screen">
          {children}
        </div>
        
        {/* The navigation bar sits at the bottom */}
        <DriverNav />
      </body>
    </html>
  );
}