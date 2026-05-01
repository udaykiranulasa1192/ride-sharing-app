"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Car, Star, Users, Calendar, ArrowLeft, Loader2, X, MapPin, RadioTower, CheckCircle } from "lucide-react";
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

  // --- THE TRANSLATOR ENGINE ---
  let searchCity = rawInput; // Default to exactly what they typed
  const upperInput = rawInput.trim().toUpperCase();

  // If they typed a postcode, translate it to the main City Hub for database searching
  if (upperInput.startsWith("CF")) {
    searchCity = "Cardiff";
  } else if (upperInput.startsWith("NP")) {
    searchCity = "Newport";
  } else if (upperInput.startsWith("BS")) {
    searchCity = "Bristol";
  } else if (upperInput.startsWith("SA")) {
    searchCity = "Swansea";
  }

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reverse Marketplace State
  const [broadcastName, setBroadcastName] = useState("");
  const [broadcastPhone, setBroadcastPhone] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  useEffect(() => {
    async function fetchRides() {
      let query = supabase.from('rides').select('*');
      
      // We search the database using the TRANSLATED city name (e.g. "Cardiff")
      if (searchCity) {
        query = query.ilike('outward_code', searchCity); 
      }
      
      if (dest) query = query.eq('destination_hub', dest);
      if (shift) query = query.eq('shift_type', shift);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error) setRides(data || []);
      setLoading(false);
    }

    if (searchCity && dest) fetchRides();
    else setLoading(false);
  }, [searchCity, dest, shift]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRideId) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('ride_requests').insert([
      {
        ride_id: selectedRideId,
        passenger_name: passengerName,
        passenger_phone: passengerPhone,
        // CRITICAL: We send their RAW input (e.g., CF24 4QY) to the driver, not just "Cardiff"
        passenger_postcode: rawInput.toUpperCase(), 
        status: 'pending'
      }
    ]);

    setIsSubmitting(false);

    if (error) {
      alert("Failed to send request. Please try again.");
    } else {
      alert("Request sent! The driver will review it shortly.");
      setSelectedRideId(null); 
      setPassengerName("");
      setPassengerPhone("");
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);

    const { error } = await supabase.from('passenger_posts').insert([
      {
        passenger_name: broadcastName,
        passenger_phone: broadcastPhone,
        // Again, save their EXACT postcode for the Opportunities board
        pickup_postcode: rawInput.toUpperCase(), 
        destination_name: dest, 
        shift_type: shift
      }
    ]);

    setIsBroadcasting(false);

    if (error) {
      alert("Failed to post request.");
      console.error(error);
    } else {
      setBroadcastSuccess(true);
    }
  };

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <>
      <div className="mb-6 rounded-2xl bg-emerald-600 p-5 text-white shadow-md">
        <h1 className="text-xl font-extrabold tracking-tight mb-2 uppercase">
          {searchCity} to {dest}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm font-medium text-emerald-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {today} ({shift})
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
          <p>Scanning for rides in {searchCity}...</p>
        </div>
      ) : rides.length === 0 ? (
        
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {broadcastSuccess ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">Request Broadcasted!</h2>
              <p className="text-gray-600 text-sm mb-6">Your ride request is now live on the driver dashboard. Drivers will reach out via WhatsApp if they can take you.</p>
              <Link href="/" className="inline-block bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-emerald-700 transition-colors">
                Return to Home
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <RadioTower className="h-6 w-6 text-gray-500" />
                </div>
                <h2 className="text-lg font-extrabold text-gray-900">No active drivers found.</h2>
                <p className="text-gray-500 text-sm mt-1">Don't worry! Broadcast your request to the driver fleet, and they will claim it if they are heading your way.</p>
              </div>

              <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Your Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., Sarah J."
                    value={broadcastName}
                    onChange={(e) => setBroadcastName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500">WhatsApp Number</label>
                  <input
                    required
                    type="tel"
                    placeholder="e.g., 07700 900000"
                    value={broadcastPhone}
                    onChange={(e) => setBroadcastPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400"
                  />
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm">
                  <p className="text-emerald-800 font-medium text-xs text-center">
                    This adds you to the <strong>Driver Opportunities Board</strong>.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white transition-colors hover:bg-gray-800 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isBroadcasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
                  {isBroadcasting ? "Broadcasting..." : "Broadcast Request"}
                </button>
              </form>
            </>
          )}
        </div>

      ) : (
        <>
          <p className="mb-4 text-sm font-bold text-gray-500 uppercase tracking-wide">
            {rides.length} Drivers Available
          </p>
          <div className="space-y-4">
            {rides.map((ride) => (
              <div key={ride.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-900">{ride.driver_name}</h2>
                    <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      5.0 <span className="font-normal text-gray-500">(New)</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Car className="h-4 w-4 text-gray-400" />
                      {ride.vehicle}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">{today} (Leaves at {ride.departure_time})</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 mb-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                      <Users className="h-4 w-4" />
                      {ride.seats_available} {ride.seats_available === 1 ? 'seat' : 'seats'} left
                    </div>
                    <div className="text-xl font-black text-gray-900">£{ride.price}</div>
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
        </>
      )}

      {selectedRideId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-gray-900">Request your seat</h3>
              <button onClick={() => setSelectedRideId(null)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Your Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Mike R."
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500">WhatsApp Number</label>
                <input
                  required
                  type="tel"
                  placeholder="e.g., 07700 900000"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400"
                />
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm flex justify-between items-center">
                <span className="text-gray-500 font-semibold">Pickup:</span>
                <span className="font-bold text-gray-900 uppercase">{rawInput}</span>
              </div>

              <p className="text-xs text-gray-500">Your number is only shared with the driver if they accept your request.</p>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70"
              >
                {isSubmitting ? "Sending..." : "Confirm Request"}
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
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/search" className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                <Car className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">ShiftPool</span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">
        <Suspense fallback={<div className="py-12 text-center text-gray-500 animate-pulse">Loading engine...</div>}>
          <ResultsContent />
        </Suspense>
      </main>
    </div>
  );
}