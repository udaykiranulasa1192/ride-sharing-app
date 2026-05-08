"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, User, PlusCircle } from "lucide-react";

export default function DriverNav() {
  const pathname = usePathname();

  // Define the navigation items
  const navItems = [
    { name: "Dashboard", href: "/driver/dashboard", icon: LayoutDashboard },
    { name: "Find Jobs", href: "/driver/jobs", icon: Map },
    { name: "Post Ride", href: "/driver", icon: PlusCircle },
    { name: "Profile", href: "/driver/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="max-w-md mx-auto flex justify-between items-center px-6 py-3">
        {navItems.map((item) => {
          // Check if this specific tab is the active one
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${
                isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-600/70'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-emerald-50' : 'bg-transparent'}`}>
                <Icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] ${isActive ? 'font-black' : 'font-bold'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}