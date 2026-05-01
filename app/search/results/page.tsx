"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Car, Users, Calendar, ArrowLeft, Loader2, X, CheckCircle, Phone, Trash2, MapPin, ShieldCheck } from "lucide-react";
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
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  
  // --- NEW: PROFESSIONAL DRIVER REQUEST STATE ---
  const [isRequestingDriver, setIsRequestingDriver] = useState(false);
  const [driverSearchActive, setDriverSearchActive] = useState(false);

  // --- MODAL STATE ---
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- MODAL FORM STATE ---
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
        const { data: previousRequests } = await supabase
          .from('ride_requests')
          .select('ride_id')
          .eq('passenger_phone', profile.mobile_number);

        if (previousRequests) {
          setSentRequests(previousRequests.map(req => req.ride_id));
        }
      }
    }
  };

  useEffect(() => {
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
      setSentRequests([...sentRequests, selectedRideId]); 
      setSelectedRideId(null); 
      setShowSuccessBanner(true); 
      setTimeout(() => setShowSuccessBanner(false), 5000);
    }
  };

  const handleCancelRequest = async (rideId: string) => {
    if (!passengerProfile) return;
    
    const confirmCancel = window.confirm("Are you sure you want to cancel this request?");
    if (confirmCancel) {
      const { error } = await supabase
        .from('ride_requests')
        .delete()
        .eq('ride_id', rideId)
        .eq('passenger_phone', passengerProfile.mobile_number);
        
      if (!error) {
        setSentRequests(prev => prev.filter(id => id !== rideId));
      } else {
        alert("Could not cancel request. Try again.");
      }
    }
  };

  // --- NEW: THE PROFESSIONAL DRIVER ASSIGNMENT LOGIC ---
  const handleRequestDriver = async () => {
    if (!passengerProfile || !authUser) return;
    setIsRequestingDriver(true);
    
    const { error } = await supabase.from('open_requests').insert([{
      passenger_id: authUser.id,
      passenger_name: `${passengerProfile.first_name} ${passengerProfile.last_name}`,
      passenger_phone: passengerProfile.mobile_number,
      outward_code: rawInput.toUpperCase(),
      destination_hub: dest,
      shift_type: shift
    }]);

    setIsRequestingDriver(false);
    if (!error) setDriverSearchActive(true);
  };

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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

      {showSuccessBanner && (
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-emerald-900">Request Sent Successfully</h3>
            <p className="text-xs text-emerald-700 mt-1">A driver will be assigned to you shortly. You will be notified via WhatsApp.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
          <p className="font-medium tracking-wide text-sm uppercase">Searching Driver Network...</p>
        </div>
      ) : rides.length === 0 ? (
        
        // --- UPGRADED: THE PROFESSIONAL NO RIDES / ACTIVE SEARCH STATE ---
        driverSearchActive ? (
          <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-lg relative overflow-hidden animate-in zoom-in duration-300">
            {/* Pulsing loading bar at the top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse"></div>
            
            {/* Animated Radar Icon */}
            <div className="relative mx-auto mb-6 h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
              <Loader2 className="h-12 w-12 text-emerald-600 animate-spin absolute opacity-30" />
              <Car className="h-7 w-7 text-emerald-700 relative z-10" />
            </div>
            
            <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Locating a Driver...</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              We have notified our network of drivers heading to {dest}. A driver will be assigned to you shortly. You will receive a WhatsApp confirmation once matched.
            </p>
            <Link href="/passenger/dashboard" className="inline-block w-full bg-emerald-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
              Track Status in Bookings
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
              <div className="mx-auto h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                <Car className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2 tracking-tight">No Drivers Scheduled</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                There are currently no cars scheduled for this specific route. Request a driver, and we will notify our network of your shift.
              </p>
              
              {authUser ? (
                <button 
                  onClick={handleRequestDriver} 
                  disabled={isRequestingDriver}
                  className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
                >
                  {isRequestingDriver ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  {isRequestingDriver ? "Processing Request..." : "Request a Driver"}
                </button>
              ) : (
                <div className="text-left mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Log in to request</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                  <PassengerAuthForm onSuccess={checkAuth} />
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* ... [Rest of the Rides Mapping is Exactly the Same] ... */}
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
                  
                  {hasRequested ? (
                    <div className="flex gap-2">
                      <button disabled className="flex-1 rounded-xl bg-emerald-50 py-3.5 text-sm font-bold text-emerald-700 border border-emerald-200 flex justify-center items-center gap-2 cursor-not-allowed">
                        <CheckCircle className="h-4 w-4" /> Request Sent
                      </button>
                      <button 
                        onClick={() => handleCancelRequest(ride.id)} 
                        className="px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex justify-center items-center"
                        title="Cancel Request"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setSelectedRideId(ride.id)}
                      className="w-full rounded-xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Request Seat
                    </button>
                  )}
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
              <div className="space-y-5">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-sm text-emerald-800 mb-3 font-medium">Your profile details will be securely shared with the driver upon confirmation:</p>
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
                  className="w-full rounded-xl bg-gray-900 py-4 text-sm font-bold text-white transition-colors hover:bg-gray-800 active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2 shadow-md"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {isSubmitting ? "Processing..." : "Confirm & Request Driver"}
                </button>
              </div>
            ) : (
              // ... [The Auth Form remains exactly the same as previous code] ...
              <form onSubmit={handleAuth} className="space-y-4">
                 {/* Keep your existing form code here! */}
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
        <Suspense fallback={<div className="py-12 flex flex-col items-center justify-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" /><p className="font-medium tracking-wide text-sm uppercase">Loading...</p></div>}>
          <ResultsContent />
        </Suspense>
      </main>
    </div>
  );
}