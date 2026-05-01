"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Car, Star, Users, Calendar, ArrowLeft, Loader2, X, MapPin, RadioTower, CheckCircle, Mail, Lock, Phone, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Ride {
  id: string;
  driver_name: string;
  vehicle: string;
  price: number;
  seats_available: number;
  departure_time: string;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const rawInput = searchParams.get("postcode") || "";
  const dest = searchParams.get("dest") || "Destination";
  const shift = searchParams.get("shift") || "morning";

  // The Translator Engine
  let searchCity = rawInput;
  const upperInput = rawInput.trim().toUpperCase();
  if (upperInput.startsWith("CF")) searchCity = "Cardiff";
  else if (upperInput.startsWith("NP")) searchCity = "Newport";
  else if (upperInput.startsWith("BS")) searchCity = "Bristol";
  else if (upperInput.startsWith("SA")) searchCity = "Swansea";

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  // --- AUTHENTICATION STATE ---
  const [authUser, setAuthUser] = useState<any>(null);
  const [passengerProfile, setPassengerProfile] = useState<any>(null);
  
  // --- MODAL STATE ---
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FORM STATE ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [postcode, setPostcode] = useState("");

  useEffect(() => {
    // 1. Check for logged-in user
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthUser(user);
        const { data: profile } = await supabase.from('passenger_profiles').select('*').eq('id', user.id).single();
        if (profile) setPassengerProfile(profile);
      }
    }
    
    // 2. Fetch the actual rides
    async function fetchRides() {
      let query = supabase.from('rides').select('*');
      if (searchCity) query = query.ilike('outward_code', searchCity);
      if (dest) query = query.eq('destination_hub', dest);
      if (shift) query = query.eq('shift_type', shift);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error) setRides(data || []);
      setLoading(false);
    }

    checkAuth();
    if (searchCity && dest) fetchRides();
    else setLoading(false);
  }, [searchCity, dest, shift]);

  // Handle authenticating a new or returning user inside the modal
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (authMode === 'signup') {
      // 1. Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) { alert(authError.message); setIsSubmitting(false); return; }
      
      // 2. Create Profile
      if (authData.user) {
        const { error: profileError } = await supabase.from('passenger_profiles').insert([{
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          mobile_number: mobile,
          postcode: postcode.toUpperCase()
        }]);
        
        if (!profileError) {
          setAuthUser(authData.user);
          setPassengerProfile({ first_name: firstName, last_name: lastName, mobile_number: mobile, postcode: postcode.toUpperCase() });
        }
      }
    } else {
      // Login
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

  // Handle sending the actual ride request once they are logged in
  const handleConfirmRequest = async () => {
    if (!selectedRideId || !passengerProfile) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('ride_requests').insert([{
        ride_id: selectedRideId,
        passenger_name: `${passengerProfile.first_name} ${passengerProfile.last_name}`,
        passenger_phone: passengerProfile.mobile_number,
        passenger_postcode: passengerProfile.postcode, 
        status: 'pending'
    }]);

    setIsSubmitting(false);

    if (error) {
      alert("Failed to send request. Please try again.");
    } else {
      alert("Success! Request sent to the driver.");
      setSelectedRideId(null); 
    }
  };

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <>
      <div className="mb-6 rounded-2xl bg-emerald-600 p-5 text-white shadow-md">
        <h1 className="text-xl font-extrabold tracking-tight mb-2 uppercase">
          {searchCity} to {dest}
        </h1>
        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-100">
          <Calendar className="h-4 w-4" /> {today} ({shift})
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
          <p>Scanning for rides...</p>
        </div>
      ) : rides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
           <RadioTower className="h-12 w-12 text-gray-300 mx-auto mb-3" />
           <h2 className="text-lg font-extrabold text-gray-900 mb-1">No active drivers found.</h2>
           <p className="text-gray-500 text-sm mb-4">Post a request to the opportunities board so drivers know you need a ride.</p>
           {/* Note: To keep code clean, we will route them to a dedicated broadcast page later, or just show a button here. */}
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => (
            <div key={ride.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">{ride.driver_name}</h2>
                  <div className="text-xl font-black text-gray-900">£{ride.price}</div>
                </div>
                <div className="space-y-1.5 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><Car className="h-4 w-4 text-gray-400" /> {ride.vehicle}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> <span className="font-semibold text-gray-900">Leaves at {ride.departure_time}</span></div>
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /> {ride.seats_available} seats left</div>
                </div>
                
                <button 
                  onClick={() => setSelectedRideId(ride.id)}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98]"
                >
                  Request Seat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- THE SMART MODAL --- */}
      {selectedRideId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-extrabold text-gray-900">
                {authUser ? "Confirm Request" : "Checkout as Passenger"}
              </h3>
              <button onClick={() => setSelectedRideId(null)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {authUser && passengerProfile ? (
              // STATE 1: USER IS LOGGED IN
              <div className="space-y-5">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-sm text-emerald-800 mb-2">We will send this data to the driver:</p>
                  <ul className="text-sm font-bold text-emerald-900 space-y-1">
                    <li>Name: {passengerProfile.first_name} {passengerProfile.last_name}</li>
                    <li>Phone: {passengerProfile.mobile_number}</li>
                    <li>Pickup: {passengerProfile.postcode}</li>
                  </ul>
                </div>
                <button
                  onClick={handleConfirmRequest}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gray-900 py-4 text-sm font-bold text-white transition-colors hover:bg-gray-800 active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {isSubmitting ? "Sending..." : "Confirm & Send to Driver"}
                </button>
              </div>
            ) : (
              // STATE 2: USER IS NOT LOGGED IN (Show Auth Form)
              <form onSubmit={handleAuth} className="space-y-4">
                
                {authMode === 'signup' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">First Name</label>
                        <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Last Name</label>
                        <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">WhatsApp</label>
                        <input required type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Pickup Postcode</label>
                        <input required type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase" />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Email</label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Password</label>
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-emerald-600 mt-2 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70"
                >
                  {isSubmitting ? "Processing..." : (authMode === 'signup' ? "Create Profile to Continue" : "Log In to Continue")}
                </button>

                <div className="text-center mt-4">
                  <button type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')} className="text-sm text-gray-500 hover:text-emerald-600 font-medium">
                    {authMode === 'signup' ? "Already have an account? Log in" : "Need an account? Sign up"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
}

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm flex items-center gap-3">
        <Link href="/search" className="p-1 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft className="h-6 w-6 text-gray-700" /></Link>
        <span className="text-lg font-bold text-gray-900">ShiftPool</span>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">
        <Suspense fallback={<div>Loading...</div>}>
          <ResultsContent />
        </Suspense>
      </main>
    </div>
  );
}