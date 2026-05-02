"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Car, 
  Phone, 
  MapPin, 
  ClipboardList, 
  LogOut, 
  Loader2, 
  ShieldCheck, 
  Edit3, 
  Save, 
  X,
  Star,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DriverNav from "@/components/DriverNav";

export default function DriverProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    vehicle_details: "",
    registration_number: "",
    mobile_number: "+44",
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
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        vehicle_details: data.vehicle_details || "",
        registration_number: data.registration_number || "",
        mobile_number: data.mobile_number || "+44",
        postcode: data.postcode || ""
      });
    }
    setLoading(false);
  }

  const handlePostcodeChange = (val: string) => {
    let formatted = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (formatted.length > 7) formatted = formatted.slice(0, 7);
    if (formatted.length > 3) {
      formatted = formatted.slice(0, formatted.length - 3) + ' ' + formatted.slice(formatted.length - 3);
    }
    setEditForm({ ...editForm, postcode: formatted });
  };

  const handlePhoneChange = (val: string) => {
    if (!val.startsWith("+44")) val = "+44";
    const raw = val.replace("+44", "").replace(/[^0-9]/g, "");
    setEditForm({ ...editForm, mobile_number: "+44" + raw });
  };

  const handleUpdate = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("driver_profiles")
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        vehicle_details: editForm.vehicle_details,
        registration_number: editForm.registration_number.toUpperCase(),
        mobile_number: editForm.mobile_number,
        postcode: editForm.postcode
      })
      .eq("id", profile.id);

    if (error) {
      alert("Failed to update profile.");
    } else {
      await fetchProfile();
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/"); 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* FIXED HEADER: Content now constrained to main app width */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500">
                <ArrowLeft className="h-5 w-5" />
             </button>
             <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">Profile</h1>
          </div>
          
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition">
              <Edit3 className="h-4 w-4" /> Edit
            </button>
          ) : (
            <button onClick={() => setIsEditing(false)} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Profile Card Header */}
        <div className="bg-emerald-600 rounded-3xl p-6 text-white text-center shadow-lg relative overflow-hidden">
          <div className="h-20 w-20 bg-white rounded-full mx-auto flex items-center justify-center mb-3 shadow-inner relative z-10">
            <User className="h-10 w-10 text-emerald-600" />
          </div>
          
          {isEditing ? (
            <div className="flex flex-col gap-2 relative z-10 max-w-[200px] mx-auto">
              <input 
                value={editForm.first_name} 
                onChange={e => setEditForm({...editForm, first_name: e.target.value})} 
                placeholder="First Name"
                className="bg-emerald-700/50 border border-emerald-400 rounded-lg px-3 py-2 text-white placeholder:text-emerald-300 outline-none font-bold text-center text-sm"
              />
              <input 
                value={editForm.last_name} 
                onChange={e => setEditForm({...editForm, last_name: e.target.value})} 
                placeholder="Last Name"
                className="bg-emerald-700/50 border border-emerald-400 rounded-lg px-3 py-2 text-white placeholder:text-emerald-300 outline-none font-bold text-center text-sm"
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold relative z-10">{profile?.first_name} {profile?.last_name}</h1>
              <p className="text-emerald-100 text-sm font-medium relative z-10">{profile?.email}</p>
            </>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rides Done</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{profile?.rides_count || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg. Rating</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{profile?.rating ? profile.rating.toFixed(1) : "5.0"}</p>
          </div>
        </div>

        {/* Details / Edit Form */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-bold w-fit">
            <ShieldCheck className="h-5 w-5" /> Verified Driver
          </div>

          <div className="space-y-4">
            {/* Vehicle Details */}
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gray-50 rounded-xl shrink-0"><Car className="h-5 w-5 text-emerald-600" /></div>
              <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vehicle Details</p>
                {isEditing ? (
                  <input value={editForm.vehicle_details} onChange={e => setEditForm({...editForm, vehicle_details: e.target.value})} className="w-full border-b border-emerald-500 py-1 focus:outline-none font-bold text-gray-900 bg-transparent" />
                ) : (
                  <p className="font-bold text-gray-900">{profile?.vehicle_details}</p>
                )}
              </div>
            </div>

            {/* Registration */}
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gray-50 rounded-xl shrink-0"><ClipboardList className="h-5 w-5 text-emerald-600" /></div>
              <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registration</p>
                {isEditing ? (
                  <input value={editForm.registration_number} onChange={e => setEditForm({...editForm, registration_number: e.target.value})} className="w-full border-b border-emerald-500 py-1 focus:outline-none font-black text-gray-900 uppercase bg-transparent" />
                ) : (
                  <p className="font-black text-gray-900 tracking-widest uppercase">{profile?.registration_number}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gray-50 rounded-xl shrink-0"><Phone className="h-5 w-5 text-emerald-600" /></div>
              <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile (WhatsApp)</p>
                {isEditing ? (
                  <input value={editForm.mobile_number} onChange={e => handlePhoneChange(e.target.value)} className="w-full border-b border-emerald-500 py-1 focus:outline-none font-bold text-gray-900 bg-transparent" />
                ) : (
                  <p className="font-bold text-gray-900">{profile?.mobile_number}</p>
                )}
              </div>
            </div>

            {/* Postcode */}
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gray-50 rounded-xl shrink-0"><MapPin className="h-5 w-5 text-emerald-600" /></div>
              <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Home Postcode</p>
                {isEditing ? (
                  <input value={editForm.postcode} onChange={e => handlePostcodeChange(e.target.value)} placeholder="CF14 2QR" className="w-full border-b border-emerald-500 py-1 focus:outline-none font-bold text-gray-900 uppercase bg-transparent" />
                ) : (
                  <p className="font-bold text-gray-900 uppercase">{profile?.postcode}</p>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <button onClick={handleUpdate} disabled={saving} className="w-full mt-4 flex justify-center items-center gap-2 bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition active:scale-[0.98] shadow-lg shadow-emerald-600/20">
              {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
              Save Profile Changes
            </button>
          )}

          {!isEditing && (
            <div className="pt-6 mt-4 border-t border-gray-100">
              <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-colors">
                <LogOut className="h-4 w-4" /> Sign Out of App
              </button>
            </div>
          )}
        </div>
      </main>
      <DriverNav />
    </div>
  );
}