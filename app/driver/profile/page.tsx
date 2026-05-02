"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Car, Phone, MapPin, ClipboardList, LogOut, Loader2, ShieldCheck, Edit3, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DriverProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    vehicle_details: "",
    registration_number: "",
    mobile_number: "",
    postcode: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      router.push("/driver/login");
      return;
    }

    const { data } = await supabase.from("driver_profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile({ ...data, email: user.email });
      setEditForm({
        vehicle_details: data.vehicle_details,
        registration_number: data.registration_number,
        mobile_number: data.mobile_number,
        postcode: data.postcode
      });
    }
    setLoading(false);
  }

  const handleUpdate = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("driver_profiles")
      .update({
        vehicle_details: editForm.vehicle_details,
        registration_number: editForm.registration_number.toUpperCase(), // Force uppercase plate
        mobile_number: editForm.mobile_number,
        postcode: editForm.postcode.toUpperCase() // Force uppercase postcode
      })
      .eq("id", profile.id);

    if (error) {
      alert("Failed to update profile.");
    } else {
      await fetchProfile(); // Refresh data to show changes
      setIsEditing(false); // Close edit mode
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/"); 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Driver Profile</h1>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition">
            <Edit3 className="h-5 w-5" />
          </button>
        ) : (
          <button onClick={() => setIsEditing(false)} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition">
            <X className="h-5 w-5" />
          </button>
        )}
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Profile Card Header */}
        <div className="bg-emerald-600 rounded-2xl p-6 text-white text-center shadow-md relative overflow-hidden">
          <div className="h-20 w-20 bg-white rounded-full mx-auto flex items-center justify-center mb-3 shadow-inner relative z-10">
            <User className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold relative z-10">{profile?.first_name} {profile?.last_name}</h1>
          <p className="text-emerald-100 text-sm font-medium relative z-10">{profile?.email}</p>
        </div>

        {/* Details / Edit Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-bold w-fit">
            <ShieldCheck className="h-5 w-5" /> Verified Driver
          </div>

          <div className="space-y-4">
            {/* Vehicle Details */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg shrink-0"><Car className="h-5 w-5 text-gray-600" /></div>
              <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vehicle</p>
                {isEditing ? (
                  <input value={editForm.vehicle_details} onChange={e => setEditForm({...editForm, vehicle_details: e.target.value})} className="w-full border-b-2 border-emerald-500 py-1 focus:outline-none font-semibold text-gray-900 bg-emerald-50/50 px-2 rounded-t" />
                ) : (
                  <p className="font-semibold text-gray-900">{profile?.vehicle_details}</p>
                )}
              </div>
            </div>

            {/* Registration */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg shrink-0"><ClipboardList className="h-5 w-5 text-gray-600" /></div>
              <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registration</p>
                {isEditing ? (
                  <input value={editForm.registration_number} onChange={e => setEditForm({...editForm, registration_number: e.target.value})} className="w-full border-b-2 border-emerald-500 py-1 focus:outline-none font-black text-gray-900 uppercase bg-emerald-50/50 px-2 rounded-t" />
                ) : (
                  <p className="font-black text-gray-900 tracking-wider uppercase">{profile?.registration_number}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg shrink-0"><Phone className="h-5 w-5 text-gray-600" /></div>
              <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Number</p>
                {isEditing ? (
                  <input value={editForm.mobile_number} onChange={e => setEditForm({...editForm, mobile_number: e.target.value})} className="w-full border-b-2 border-emerald-500 py-1 focus:outline-none font-semibold text-gray-900 bg-emerald-50/50 px-2 rounded-t" />
                ) : (
                  <p className="font-semibold text-gray-900">{profile?.mobile_number}</p>
                )}
              </div>
            </div>

            {/* Postcode */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg shrink-0"><MapPin className="h-5 w-5 text-gray-600" /></div>
              <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Home Postcode</p>
                {isEditing ? (
                  <input value={editForm.postcode} onChange={e => setEditForm({...editForm, postcode: e.target.value})} className="w-full border-b-2 border-emerald-500 py-1 focus:outline-none font-semibold text-gray-900 uppercase bg-emerald-50/50 px-2 rounded-t" />
                ) : (
                  <p className="font-semibold text-gray-900 uppercase">{profile?.postcode}</p>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <button onClick={handleUpdate} disabled={saving} className="w-full mt-4 flex justify-center items-center gap-2 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition active:scale-[0.98] shadow-md">
              {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
              Save Changes
            </button>
          )}

          {!isEditing && (
            <div className="pt-6 mt-4 border-t border-gray-100">
              <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors">
                <LogOut className="h-5 w-5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}