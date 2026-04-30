"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User, Users } from "lucide-react";

export default function DriverNav() {
  const pathname = usePathname();

  if (!pathname || !pathname.startsWith("/driver")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        <Link href="/driver/dashboard" className={`flex flex-col items-center gap-1 p-2 ${pathname === '/driver/dashboard' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </Link>
        
        <Link href="/driver" className={`flex flex-col items-center gap-1 p-2 ${pathname === '/driver' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <PlusCircle className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase">Post</span>
        </Link>

        {/* NEW JOBS BOARD ICON */}
        <Link href="/driver/passengers" className={`flex flex-col items-center gap-1 p-2 ${pathname === '/driver/passengers' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase">Jobs</span>
        </Link>

        <Link href="/driver/profile" className={`flex flex-col items-center gap-1 p-2 ${pathname === '/driver/profile' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <User className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </Link>
      </div>
    </nav>
  );
}