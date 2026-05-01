"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, LogOut, Loader2, ChevronRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PassengerBottomNav from "@/components/PassengerBottomNav";

export default function PassengerProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/passenger/signup");
        return;
      }
      setUserEmail(user.email ?? null);

      const { data } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
      setLoading(false);
    }
    getProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/search");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white px-4 py-6 border-b border-gray-200 shadow-sm">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">My Profile</h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* User Identity Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile?.first_name} {profile?.last_name}</h2>
            <p className="text-sm text-gray-500 font-medium">Passenger Member</p>
          </div>
        </div>

        {/* Details List */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                <p className="text-sm font-semibold text-gray-900">{userEmail}</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp</p>
                <p className="text-sm font-semibold text-gray-900">{profile?.mobile_number}</p>
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Home Postcode</p>
                <p className="text-sm font-semibold text-gray-900">{profile?.postcode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Badge */}
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <p className="text-xs text-emerald-800 leading-tight">
            Your contact details are only shared with drivers once you request a seat.
          </p>
        </div>

        {/* Action Buttons */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </main>

      <PassengerBottomNav />
    </div>
  );
}