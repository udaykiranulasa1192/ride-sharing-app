"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Car, Search, User } from "lucide-react";

export default function DriverNav() {
  const pathname = usePathname();

  // Hide nav on login/register pages, or if we are not in the driver section
  if (
    !pathname || 
    pathname.includes("/login") || 
    pathname.includes("/register") || 
    !pathname.startsWith("/driver")
  ) {
    return null;
  }

  const navItems = [
    { name: "Home", href: "/driver", icon: Home },
    { name: "My Rides", href: "/driver/dashboard", icon: Car },
    { name: "Jobs", href: "/driver/passengers", icon: Search },
    { name: "Profile", href: "/driver/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-[100]">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Strict exact match for Home so it doesn't stay highlighted everywhere
          const isActive = item.href === '/driver' ? pathname === '/driver' : pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-emerald-600" : "text-gray-400 hover:text-emerald-500"
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? "fill-emerald-50" : ""}`} />
              <span className="text-[10px] font-bold tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}