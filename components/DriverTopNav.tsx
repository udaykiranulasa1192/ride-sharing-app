"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, UserCircle, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DriverTopNav() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // THE BRAIN: Listen to Supabase to see if the driver is logged in
  useEffect(() => {

    if (typeof window !== 'undefined') {
      localStorage.setItem('shiftpool_portal', 'driver');
    }
    
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null); // Instantly clear state for a snappy UI
    router.push("/driver"); 
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Logo Escape Hatch */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-md">
            <Car className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-gray-900 tracking-tight leading-none">ShiftPool</span>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Driver Portal</span>
          </div>
        </Link>

        {/* Dynamic Auth Button - Waits for loading to finish so it doesn't flicker */}
        {!loading && (
          user ? (
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors shadow-sm border border-red-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link 
              href="/driver" 
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors shadow-sm"
            >
              <UserCircle className="h-4 w-4" />
              <span>Login</span>
            </Link>
          )
        )}

      </div>
    </div>
  );
}