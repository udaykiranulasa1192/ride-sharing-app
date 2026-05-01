"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Car, Users, Calendar, ArrowLeft, Loader2, X, RadioTower, CheckCircle, Phone } from "lucide-react";
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

  // --- AUTH & TRACKING STATE ---
  const [authUser, setAuthUser] = useState<any>(null);
  const [passengerProfile, setPassengerProfile] = useState<any>(null);
  const [sentRequests, setSentRequests] = useState<string[]>([]); // Tracks which rides we've requested
  const [showSuccessBanner, setShowSuccessBanner] = useState(false); // Shows a nice success message
  
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
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthUser(user);
        const { data: profile } = await supabase.from('passenger_profiles').select('*').eq('id', user.id).single();
        
        if (profile) {
          setPassengerProfile(profile);

          // --- THE FIX: MEMORY RECOVERY ---
          // Ask the database: "Has this phone number already requested any rides?"
          const { data: previousRequests } = await supabase
            .from('ride_requests')
            .select('ride_id')
            .eq('passenger_phone', profile.mobile_number);

          if (previousRequests) {
            // Put all the ride_ids they previously requested into our React State
            const requestedRideIds = previousRequests.map(req => req.ride_id);
            setSentRequests(requestedRideIds);
          }
        }
      }
    }
    
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
  }, [searchCity, dest, shift]);useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthUser(user);
        const { data: profile } = await supabase.from('passenger_profiles').select('*').eq('id', user.id).single();
        
        if (profile) {
          setPassengerProfile(profile);

          // --- THE FIX: MEMORY RECOVERY ---
          // Ask the database: "Has this phone number already requested any rides?"
          const { data: previousRequests } = await supabase
            .from('ride_requests')
            .select('ride_id')
            .eq('passenger_phone', profile.mobile_number);

          if (previousRequests) {
            // Put all the ride_ids they previously requested into our React State
            const requestedRideIds = previousRequests.map(req => req.ride_id);
            setSentRequests(requestedRideIds);
          }
        }
      }
    }
    
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (authMode === 'signup') {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) { alert(authError.message); setIsSubmitting(false); return; }
      
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
      // SUCCESS! Update UI instead of showing an annoying alert
      setSentRequests([...sentRequests, selectedRideId]); // Mark this ride as requested
      setSelectedRideId(null); // Close modal
      setShowSuccessBanner(true); // Show banner
      
      // Hide banner after 5 seconds
      setTimeout(() => setShowSuccessBanner(false), 5000);
    }
  };

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  // FIXED: A shared class that forces text to be dark gray (text-gray-900)
  const inputClassName = "w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400";

  return (
    <>
      <div className="mb-6 rounded-2xl bg-emerald-600 p-5 text-white shadow-md relative overflow-hidden">
        <h1 className="text-xl font-extrabold tracking-tight mb-2 uppercase relative z-10">
          {searchCity} to {dest}
        </h1>
        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-100 relative z-10">
          <Calendar className="h-4 w-4" /> {today} ({shift})
        </div>
      </div>

      {/* NEW: Success Banner */}
      {showSuccessBanner && (
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-emerald-900">Request Sent Successfully!</h3>
            <p className="text-xs text-emerald-700 mt-1">The driver has been notified. They will message you on WhatsApp if they accept your request.</p>
          </div>
        </div>
      )}

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
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => {
            const hasRequested = sentRequests.includes(ride.id);

            return (
              <div key={ride.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${hasRequested ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-gray-200 hover:shadow-md'}`}>
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
                  
                  {/* FIXED: Dynamic Button State */}
                  <button 
                    onClick={() => !hasRequested && setSelectedRideId(ride.id)}
                    disabled={hasRequested}
                    className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-2 ${
                      hasRequested 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {hasRequested ? (
                      <>
                        <CheckCircle className="h-4 w-4" /> Request Sent
                      </>
                    ) : (
                      "Request Seat"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
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
                  <p className="text-sm text-emerald-800 mb-3">We will send this data to the driver:</p>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-emerald-100 pb-2">
                      <span className="text-emerald-700 text-xs font-bold uppercase">Name</span>
                      <span className="text-emerald-900 font-semibold text-sm">{passengerProfile.first_name} {passengerProfile.last_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-emerald-100 pb-2">
                      <span className="text-emerald-700 text-xs font-bold uppercase">Phone</span>
                      <span className="text-emerald-900 font-semibold text-sm">{passengerProfile.mobile_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700 text-xs font-bold uppercase">Pickup</span>
                      <span className="text-emerald-900 font-semibold text-sm">{passengerProfile.postcode}</span>
                    </div>
                  </div>
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
              // STATE 2: USER IS NOT LOGGED IN 
              // FIXED: Completely stacked vertically (no grid), using inputClassName to ensure text is visible!
              <form onSubmit={handleAuth} className="space-y-4">
                
                {authMode === 'signup' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-500">First Name</label>
                      <input required type="text" placeholder="e.g., Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClassName} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-500">Last Name</label>
                      <input required type="text" placeholder="e.g., Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClassName} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-500">WhatsApp Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input required type="tel" placeholder="07700 900000" value={mobile} onChange={(e) => setMobile(e.target.value)} className={`${inputClassName} pl-9`} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-500">Pickup Postcode</label>
                      <input required type="text" placeholder="e.g., CF24 4QY" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={`${inputClassName} uppercase`} />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Email Address</label>
                  <input required type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Password</label>
                  <input required type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassName} />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-emerald-600 mt-2 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70"
                >
                  {isSubmitting ? "Processing..." : (authMode === 'signup' ? "Create Profile & Continue" : "Log In & Continue")}
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
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/search" className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </Link>
          <span className="text-lg font-bold text-gray-900">ShiftPool</span>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">
        <Suspense fallback={<div className="py-12 text-center text-gray-500">Loading...</div>}>
          <ResultsContent />
        </Suspense>
      </main>
    </div>
  );
}