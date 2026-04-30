"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Car, Phone, MapPin, ClipboardList, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DriverProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      // 1. Get auth user (email)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/driver/login");
        return;
      }

      // 2. Get the specific driver profile details linked to this user
      const { data, error } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        // Combine the auth email with the profile database data
        setProfile({ ...data, email: user.email });
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/"); // Boot them back to the landing page
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Clickable Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        <Link href="/" className="mx-auto flex max-w-md items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Car className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">ShiftPool</span>
        </Link>
      </header>

      <main className="max-w-md mx-auto p-4 mt-2">
        <div className="bg-emerald-600 rounded-t-2xl p-6 text-white text-center shadow-md">
          <div className="h-20 w-20 bg-white rounded-full mx-auto flex items-center justify-center mb-3 shadow-inner">
            <User className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold">{profile?.full_name}</h1>
          <p className="text-emerald-100 text-sm font-medium">{profile?.email}</p>
        </div>

        <div className="bg-white rounded-b-2xl border-x border-b border-gray-200 p-5 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-bold">
            <ShieldCheck className="h-5 w-5" /> Authorized Driver
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg"><Car className="h-5 w-5 text-gray-600" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Vehicle</p>
                <p className="font-semibold text-gray-900">{profile?.car_model}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg"><ClipboardList className="h-5 w-5 text-gray-600" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Registration</p>
                <p className="font-black text-gray-900 tracking-wider">{profile?.car_reg}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg"><Phone className="h-5 w-5 text-gray-600" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Contact Number</p>
                <p className="font-semibold text-gray-900">{profile?.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg"><MapPin className="h-5 w-5 text-gray-600" /></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Home Area</p>
                <p className="font-semibold text-gray-900">{profile?.postcode}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
            >
              <LogOut className="h-5 w-5" /> Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}