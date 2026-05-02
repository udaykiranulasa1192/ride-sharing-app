"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Car, Users, Calendar, ArrowLeft, Loader2, X, CheckCircle, Phone, Trash2, MapPin, ShieldCheck, UserPlus, Plus } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PassengerAuthForm from "@/components/PassengerAuthForm"; 

interface Ride {
  id: string;
  driver_name: string;
  vehicle: string;
  price: number;
  seats_available: number;
  departure_time: string;
}

// --- SMART POSTCODE FORMATTER ---
const formatPostcode = (value: string) => {
  const raw = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  // Standard UK format: space always goes before the last 3 characters
  if (raw.length >= 5) {
    return raw.slice(0, -3) + ' ' + raw.slice(-3);
  }
  return raw;
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const rawInput = searchParams.get("postcode") || "";
  const dest = searchParams.get("dest") || "Destination";
  const shift = searchParams.get("shift") || "morning";

  let searchCity = rawInput;
  const upperInput = rawInput.trim().toUpperCase();
  if (upperInput.startsWith("CF")) searchCity = "Cardiff";
  else if (upperInput.startsWith("NP")) searchCity = "Newport";
  else if (upperInput.startsWith("BS")) searchCity = "Bristol";
  else if (upperInput.startsWith("SA")) searchCity = "Swansea";

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  // --- AUTH & TRACKING STATE ---
  const [authUser, setAuthUser] = useState<any>(null);
  const [passengerProfile, setPassengerProfile] = useState<any>(null);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  
  // --- PROFESSIONAL DRIVER REQUEST STATE ---
  const [isRequestingDriver, setIsRequestingDriver] = useState(false);
  const [driverSearchActive, setDriverSearchActive] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false); // Prevents modal from popping up infinitely

  const [existingRequest, setExistingRequest] = useState<any>(null);

  // --- MODAL STATES ---
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  
  // Modal Inputs
  const [reqName, setReqName] = useState("");
  const [reqPhone, setReqPhone] = useState("");
  const [reqPostcode, setReqPostcode] = useState("");
  const [friendPostcodes, setFriendPostcodes] = useState<string[]>([]); // Dynamic array for friends

  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [postcode, setPostcode] = useState("");

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setAuthUser(user);
      const { data: profile } = await supabase.from('passenger_profiles').select('*').eq('id', user.id).single();
      
      if (profile) {
        setPassengerProfile(profile);
        const { data: previousRequests } = await supabase.from('ride_requests').select('ride_id').eq('passenger_phone', profile.mobile_number);
        if (previousRequests) setSentRequests(previousRequests.map(req => req.ride_id));
      }
    }
  };

useEffect(() => {
    async function fetchData() {
      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthUser(user);
        const { data: profile } = await supabase.from('passenger_profiles').select('*').eq('id', user.id).single();
        if (profile) setPassengerProfile(profile);

        // 2. CHECK FOR EXISTING OPEN REQUESTS!
        const { data: existing } = await supabase
          .from('open_requests')
          .select('*')
          .eq('passenger_id', user.id)
          .eq('status', 'open')
          .eq('destination_hub', dest)
          .eq('shift_type', shift)
          .single();
        
        if (existing) {
          setExistingRequest(existing);
          setDriverSearchActive(true); // Forces the UI to show the "Locating Driver" radar
        }
      }

      // 3. Fetch Rides
      let query = supabase.from('rides').select('*');
      if (searchCity) query = query.ilike('outward_code', searchCity);
      if (dest) query = query.eq('destination_hub', dest);
      if (shift) query = query.eq('shift_type', shift);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error) setRides(data || []);
      setLoading(false);
    }

    fetchData();
  }, [searchCity, dest, shift]);

  // --- AUTO OPEN MODAL LOGIC ---
 useEffect(() => {
    if (!loading && rides.length === 0 && authUser && passengerProfile && !hasAutoOpened && !driverSearchActive && !existingRequest) {
      openBroadcastModal();
      setHasAutoOpened(true); 
    }
  }, [loading, rides.length, authUser, passengerProfile, hasAutoOpened, driverSearchActive, existingRequest]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (authMode === 'signup') {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) { alert(authError.message); setIsSubmitting(false); return; }
      if (authData.user) {
        await supabase.from('passenger_profiles').insert([{ id: authData.user.id, first_name: firstName, last_name: lastName, mobile_number: mobile, postcode: postcode.toUpperCase() }]);
        setAuthUser(authData.user);
        setPassengerProfile({ first_name: firstName, last_name: lastName, mobile_number: mobile, postcode: postcode.toUpperCase() });
      }
    } else {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { alert(authError.message); setIsSubmitting(false); return; }
      if (authData.user) {
        setAuthUser(authData.user);
        const { data: profile } = await supabase.from('passenger_profiles').select('*').eq('id', authData.user.id).single();
        if (profile) setPassengerProfile(profile);
      }
    }
    setIsSubmitting(false);
  };

  const openBroadcastModal = () => {
    if (passengerProfile) {
      setReqName(`${passengerProfile.first_name} ${passengerProfile.last_name}`);
      setReqPhone(passengerProfile.mobile_number);
      // Pre-fill and auto-format the searched postcode or their home postcode
      setReqPostcode(formatPostcode(rawInput || passengerProfile.postcode || ""));
    }
    setFriendPostcodes([]); // Start with 0 friends
    setShowBroadcastModal(true);
  };

  // Dynamic Friends Logic
  const addFriendInput = () => setFriendPostcodes([...friendPostcodes, ""]);
  const updateFriendPostcode = (index: number, val: string) => {
    const updated = [...friendPostcodes];
    updated[index] = formatPostcode(val);
    setFriendPostcodes(updated);
  };
  const removeFriendInput = (index: number) => {
    const updated = [...friendPostcodes];
    updated.splice(index, 1);
    setFriendPostcodes(updated);
  };

  const submitCustomBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerProfile || !authUser) return;
    setIsRequestingDriver(true);
    
    // Merge all the pick-up locations together for the driver
    let finalLocation = reqPostcode;
    const validFriends = friendPostcodes.filter(p => p.trim() !== "");
    if (validFriends.length > 0) {
      finalLocation += ` (+ Pickups at: ${validFriends.join(", ")})`;
    }

    const { error } = await supabase.from('open_requests').insert([{
      passenger_id: authUser.id,
      passenger_name: reqName,
      passenger_phone: reqPhone,
      outward_code: finalLocation,
      destination_hub: dest,
      shift_type: shift
    }]);

    setIsRequestingDriver(false);
    setShowBroadcastModal(false);
    if (!error) setDriverSearchActive(true);
  };

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const inputClassName = "w-full rounded-xl border border-gray-300 bg-gray-50 p-3 pl-10 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400";

  return (
    // ... rest of your code
    <>
      <div className="mb-6 rounded-2xl bg-emerald-600 p-5 text-white shadow-md relative overflow-hidden">
        <h1 className="text-xl font-extrabold tracking-tight mb-2 uppercase relative z-10">{searchCity} to {dest}</h1>
        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-100 relative z-10"><Calendar className="h-4 w-4" /> {today} ({shift})</div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500"><Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" /></div>
      ) : rides.length === 0 ? (
        
        driverSearchActive ? (
          <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-lg relative overflow-hidden animate-in zoom-in duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse"></div>
            <div className="relative mx-auto mb-6 h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
              <Loader2 className="h-12 w-12 text-emerald-600 animate-spin absolute opacity-30" />
              <Car className="h-7 w-7 text-emerald-700 relative z-10" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Locating a Driver...</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">We have notified our network of drivers. A driver will be assigned to you shortly.</p>
            <Link href="/passenger/dashboard" className="inline-block w-full bg-emerald-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">Track Status in Bookings</Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
              <div className="mx-auto h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100"><Car className="h-8 w-8 text-gray-400" /></div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2 tracking-tight">No Drivers Scheduled</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">There are currently no cars scheduled for this route. Request a driver, and we will notify our network.</p>
              
              {authUser ? (
                <button 
                  onClick={openBroadcastModal} 
                  className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-all flex justify-center items-center gap-2"
                >
                  <ShieldCheck className="h-5 w-5" /> Customize & Request Driver
                </button>
              ) : (
                <div className="text-left mt-6">
                  <PassengerAuthForm onSuccess={checkAuth} />
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* Mapping actual rides code... */}
        </div>
      )}

      {/* --- SMART CUSTOM BROADCAST MODAL --- */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Confirm Request</h3>
              <button onClick={() => setShowBroadcastModal(false)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Your details are securely shared with the driver upon match.</p>

            <form onSubmit={submitCustomBroadcast} className="space-y-4">
              
              {/* Locked Profile Details */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Passenger</label>
                  <input readOnly type="text" value={reqName} className="w-full rounded-xl border border-gray-200 bg-gray-100 p-3 text-sm text-gray-500 outline-none cursor-not-allowed font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input readOnly type="tel" value={reqPhone} className="w-full rounded-xl border border-gray-200 bg-gray-100 p-3 pl-9 text-sm text-gray-500 outline-none cursor-not-allowed font-medium" />
                  </div>
                </div>
              </div>

              {/* Editable Pickup Detail */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-emerald-600">Your Primary Pickup Postcode</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  <input required type="text" value={reqPostcode} onChange={e => setReqPostcode(formatPostcode(e.target.value))} className={`${inputClassName} font-bold`} />
                </div>
              </div>

              {/* Add Friends Section */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <label className="text-xs font-bold uppercase text-blue-800">Additional Pickups</label>
                  </div>
                  <button type="button" onClick={addFriendInput} className="bg-blue-600 text-white p-1 rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Dynamically render Friend Postcode inputs */}
                {friendPostcodes.map((postcode, idx) => (
                  <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                    <input 
                      required
                      type="text" 
                      value={postcode} 
                      onChange={e => updateFriendPostcode(idx, e.target.value)} 
                      placeholder="Friend's Postcode (e.g. CF14 2AA)" 
                      className="flex-1 rounded-lg border border-blue-200 bg-white p-2.5 text-sm text-gray-900 outline-none font-bold placeholder:font-normal placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                    />
                    <button type="button" onClick={() => removeFriendInput(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <p className="text-[10px] text-blue-600/80 leading-tight">If you are picking up friends, add their postcodes to help the driver plan the route.</p>
              </div>

              <button disabled={isRequestingDriver} type="submit" className="w-full mt-2 rounded-xl bg-gray-900 py-4 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-70 flex justify-center items-center gap-2 shadow-md">
                {isRequestingDriver ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                {isRequestingDriver ? "Locating Driver..." : "Confirm & Send to Drivers"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/search" className="p-1 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft className="h-6 w-6 text-gray-700" /></Link>
          <span className="text-lg font-bold text-gray-900">ShiftPool</span>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">
        <Suspense fallback={<div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
          <ResultsContent />
        </Suspense>
      </main>
    </div>
  );
}