"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, LogOut, UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Listen for auth changes to update the button instantly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Initial check
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthAction = async () => {
    if (user) {
      // If logged in: Sign out and go to the very beginning (Home)
      await supabase.auth.signOut();
      router.push("/"); 
    } else {
      // If not logged in: Send them to a login page (defaulting to passenger here)
      router.push("/passenger/profile");
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-[100] shadow-sm">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* LEFT SIDE: LOGO & NAME */}
        <Link href="/" className="flex items-center gap-2.5 active:scale-95 transition-transform">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-gray-900 tracking-tight leading-none">ShiftPool</span>
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Commute Better</span>
          </div>
        </Link>

        {/* RIGHT SIDE: CONDITIONAL AUTH BUTTON */}
        <button 
          onClick={handleAuthAction}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm border ${
            user 
              ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
              : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
          }`}
        >
          {user ? (
            <>
              <LogOut className="h-4 w-4" />
              Sign Out
            </>
          ) : (
            <>
              <UserCircle className="h-4 w-4" />
              Login
            </>
          )}
        </button>

      </div>
    </header>
  );
}