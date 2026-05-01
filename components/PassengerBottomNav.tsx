"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, CalendarDays, User } from "lucide-react";

export default function PassengerBottomNav() {
  const pathname = usePathname() || "";

  // Exact matching for your active tabs
  const isSearch = pathname.startsWith("/search");
  const isBookings = pathname.includes("/passenger/dashboard");
  const isProfile = pathname.includes("/passenger/profile");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-6 pt-2 px-6 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex max-w-md justify-between items-center">
        
        <Link 
          href="/search" 
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${isSearch ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
        >
          <Search className={`h-6 w-6 ${isSearch ? "stroke-[2.5px]" : "stroke-2"}`} />
          <span className="text-[10px] font-bold tracking-wide uppercase">Search</span>
        </Link>

        <Link 
          href="/passenger/dashboard" 
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${isBookings ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
        >
          <CalendarDays className={`h-6 w-6 ${isBookings ? "stroke-[2.5px]" : "stroke-2"}`} />
          <span className="text-[10px] font-bold tracking-wide uppercase">Bookings</span>
        </Link>

        <Link 
          href="/passenger/profile" 
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${isProfile ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
        >
          <User className={`h-6 w-6 ${isProfile ? "stroke-[2.5px]" : "stroke-2"}`} />
          <span className="text-[10px] font-bold tracking-wide uppercase">Profile</span>
        </Link>

      </div>
    </div>
  );
}