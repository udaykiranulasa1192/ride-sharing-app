"use client";

import { useEffect, useState } from "react";
import { User, Mail, Phone, MapPin, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import PassengerAuthForm from "@/components/PassengerAuthForm"; // IMPORT NEW FORM

export default function PassengerProfile() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState<string>("");

  // Extracted so the Auth form can call it when finished
  const loadProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }
    
    setIsLoggedIn(true);
    setEmail(user.email || "");

    const { data } = await supabase.from("passenger_profiles").select("*").eq("id", user.id).single();
    if (data) setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setProfile(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-32 flex flex-col">
      <header className="bg-white px-4 py-4 border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight text-center">My Profile</h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 w-full flex-1">
        {!isLoggedIn ? (
          // EMBED THE FORM DIRECTLY HERE
          <div className="mt-4">
             <PassengerAuthForm onSuccess={loadProfile} />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shrink-0">
                <User className="h-8 w-8" />
              </div>
              <div className="overflow-hidden">
                <h2 className="text-xl font-bold text-gray-900 truncate">{profile?.first_name} {profile?.last_name}</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Passenger</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center gap-4"><Mail className="h-5 w-5 text-gray-300 shrink-0" /><div className="overflow-hidden"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Email</p><p className="text-sm font-semibold text-gray-900 truncate">{email}</p></div></div>
              <div className="p-4 border-b border-gray-50 flex items-center gap-4"><Phone className="h-5 w-5 text-gray-300 shrink-0" /><div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">WhatsApp</p><p className="text-sm font-semibold text-gray-900">{profile?.mobile_number}</p></div></div>
              <div className="p-4 flex items-center gap-4"><MapPin className="h-5 w-5 text-gray-300 shrink-0" /><div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Default Postcode</p><p className="text-sm font-semibold text-gray-900 uppercase">{profile?.postcode}</p></div></div>
            </div>

            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all mt-8">
              <LogOut className="h-5 w-5" /> Sign Out
            </button>
          </>
        )}
      </main>
      <PassengerBottomNav />
    </div>
  );
}