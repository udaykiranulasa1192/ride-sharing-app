"use client";

import { useEffect, useState } from "react";
import { User, Mail, Phone, MapPin, LogOut, Loader2, Edit3, Save, X, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import PassengerAuthForm from "@/components/PassengerAuthForm";

export default function PassengerProfile() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("passenger_profiles").update({
      first_name: profile.first_name,
      last_name: profile.last_name,
      mobile_number: profile.mobile_number,
      postcode: profile.postcode.toUpperCase()
    }).eq('id', user?.id);

    if (!error) setIsEditing(false);
    setSaveLoading(false);
  };

  useEffect(() => { loadProfile(); }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white px-6 py-6 border-b border-gray-100 sticky top-0 z-50">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Profile Settings</h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {!isLoggedIn ? (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
             <PassengerAuthForm onSuccess={loadProfile} />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            {/* PROFILE CARD */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shadow-inner">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 leading-none">{profile?.first_name} {profile?.last_name}</h2>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">Active Passenger</p>
                </div>
              </div>
              <button onClick={() => setIsEditing(!isEditing)} className={`p-3 rounded-xl transition-all ${isEditing ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                {isEditing ? <X className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
              </button>
            </div>

            {/* INFO FORM */}
            <form onSubmit={handleUpdate} className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email (Primary)</label>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <Mail className="h-5 w-5 text-gray-300" />
                    <span className="text-sm font-bold text-gray-500">{email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First & Last Name</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input disabled={!isEditing} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 disabled:opacity-50" value={profile?.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} />
                    <input disabled={!isEditing} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 disabled:opacity-50" value={profile?.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Mobile</label>
                  <input disabled={!isEditing} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 disabled:opacity-50" value={profile?.mobile_number} onChange={e => setProfile({...profile, mobile_number: e.target.value})} />
                </div>

                {isEditing && (
                  <button type="submit" disabled={saveLoading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
                    {saveLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} SAVE UPDATES
                  </button>
                )}
              </div>
            </form>

            <button onClick={() => { supabase.auth.signOut(); setIsLoggedIn(false); }} className="w-full flex items-center justify-center gap-2 bg-white text-red-500 font-black py-4 rounded-2xl shadow-sm border border-red-50 hover:bg-red-50 transition-all">
              <LogOut className="h-5 w-5" /> SIGN OUT
            </button>
          </div>
        )}
      </main>
      <PassengerBottomNav />
    </div>
  );
}