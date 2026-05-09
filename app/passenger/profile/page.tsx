"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Phone, 
  MapPin, 
  LogOut, 
  Loader2, 
  ShieldCheck, 
  Edit3, 
  Save, 
  X,
  Star,
  CheckCircle,
  Mail,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import PassengerAuthForm from "@/components/PassengerAuthForm";

export default function PassengerProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Sleek Error/Success Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    mobile_number: "+44",
    postcode: "" // We will use this for Postcode OR Place Name
  });

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
    
    if (data) {
      setProfile(data);
      setEditForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        mobile_number: data.mobile_number || "+44",
        postcode: data.postcode || ""
      });
    }
    setLoading(false);
  };

  useEffect(() => { 
    loadProfile(); 
  }, []);

  const handlePhoneChange = (val: string) => {
    if (!val.startsWith("+44")) val = "+44";
    const raw = val.replace("+44", "").replace(/[^0-9]/g, "");
    setEditForm({ ...editForm, mobile_number: "+44" + raw });
  };

  // THE UPGRADE: Smart Geocoder Save Logic
  const handleUpdate = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let lat = null;
    let lng = null;
    let finalLocationName = editForm.postcode.trim();

    if (finalLocationName) {
      try {
        // 1. TRY STRICT POSTCODE API FIRST
        const cleanPostcode = finalLocationName.replace(/\s+/g, '').toUpperCase();
        const postRes = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
        const postData = await postRes.json();
        
        if (postData.status === 200) {
          lat = postData.result.latitude;
          lng = postData.result.longitude;
          finalLocationName = postData.result.postcode; // Format it nicely
        } else {
          // 2. FALLBACK TO OPENSTREETMAP FOR PLACE NAMES (e.g., "The Range")
          const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(finalLocationName + ', UK')}&format=json&limit=1`);
          const osmData = await osmRes.json();

          if (osmData && osmData.length > 0) {
            lat = parseFloat(osmData[0].lat);
            lng = parseFloat(osmData[0].lon);
          } else {
            setToast({ type: 'error', message: "We couldn't find that location. Please try adding the city name." });
            setSaving(false);
            return;
          }
        }
      } catch (err) {
        setToast({ type: 'error', message: "Network error while verifying location." });
        setSaving(false);
        return;
      }
    }
    
    // 3. Save to database including coordinates
    const { error } = await supabase
      .from("passenger_profiles")
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        mobile_number: editForm.mobile_number,
        postcode: finalLocationName, // Saves formatted postcode OR place name
        home_latitude: lat,
        home_longitude: lng
      })
      .eq('id', user.id);

    if (error) {
      setToast({ type: 'error', message: "Failed to update profile." });
    } else {
      setToast({ type: 'success', message: "Profile saved securely!" });
      await loadProfile();
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    router.push("/"); 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-24 relative">

      {/* Sleek Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-0 right-0 z-[200] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-gray-900 text-white rounded-xl p-3 shadow-xl flex items-center gap-3 w-full max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
            {toast.type === 'error' ? <AlertCircle className="h-5 w-5 text-red-400 shrink-0" /> : <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />}
            <p className="flex-1 text-sm font-semibold">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">Passenger Profile</h1>
          </div>
          
          {isLoggedIn && (
            !isEditing ? (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition">
                <Edit3 className="h-4 w-4" /> Edit
              </button>
            ) : (
              <button onClick={() => setIsEditing(false)} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition">
                <X className="h-5 w-5" />
              </button>
            )
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        
        {!isLoggedIn ? (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
             <PassengerAuthForm onSuccess={loadProfile} />
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            
            {/* HERO PROFILE CARD */}
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
                  <p className="text-emerald-100 text-sm font-medium relative z-10">{email}</p>
                </>
              )}
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Trips Taken</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{profile?.trips_count || 0}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                  <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg. Rating</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{profile?.rating ? profile.rating.toFixed(1) : "5.0"}</p>
              </div>
            </div>

            {/* DETAILS / EDIT FORM */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-5">
              
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-bold w-fit">
                <ShieldCheck className="h-5 w-5" /> Verified Passenger
              </div>

              <div className="space-y-4">
                
                {/* Email (Read Only) */}
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-gray-50 rounded-xl shrink-0"><Mail className="h-5 w-5 text-emerald-600" /></div>
                  <div className="w-full">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Email</p>
                    <p className="font-bold text-gray-900">{email}</p>
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

                {/* Postcode / Location */}
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-gray-50 rounded-xl shrink-0"><MapPin className="h-5 w-5 text-emerald-600" /></div>
                  <div className="w-full">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pickup Location</p>
                    {isEditing ? (
                      <input 
                        value={editForm.postcode} 
                        onChange={e => setEditForm({...editForm, postcode: e.target.value})} 
                        placeholder="e.g. CF14 2QR or The Range" 
                        className="w-full border-b border-emerald-500 py-1 focus:outline-none font-bold text-gray-900 bg-transparent" 
                      />
                    ) : (
                      <p className="font-bold text-gray-900 capitalize">{profile?.postcode}</p>
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
          </div>
        )}
      </main>
      
      <PassengerBottomNav />
    </div>
  );
}