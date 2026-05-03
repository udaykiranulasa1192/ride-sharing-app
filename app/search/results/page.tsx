"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Car, 
  Loader2, 
  ArrowLeft, 
  ShieldCheck, 
  Rss, 
  MapPin, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

function ResultsLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Add this inside ResultsLogic
  const [requestedRideIds, setRequestedRideIds] = useState<Set<string>>(new Set());
  // Extract data passed from the Search funnel
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const date = searchParams.get("date") || "";
  const shift = searchParams.get("shift") || "";
  const friendsParam = searchParams.get("friends") || "";
  
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

useEffect(() => {
    async function fetchRides() {
      const friendsList = friendsParam ? friendsParam.split(',') : [];
      const totalSeatsNeeded = 1 + friendsList.length;

      // 1. Fetch available rides
      const { data: ridesData, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .gte('remaining_seats', totalSeatsNeeded)
        .eq('ride_date', date)
        .eq('departure_time', shift)
        .ilike('destination_hub', `%${to}%`);

      if (!error && ridesData) setRides(ridesData);

      // 2. Fetch user's existing requests (THE UI BOUNCER)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: matches } = await supabase
          .from('trip_matches')
          .select('ride_id')
          .eq('passenger_id', user.id)
          .in('match_status', ['pending', 'confirmed']);
        
        if (matches) {
          // THE FIX: Wrap m.ride_id in String() to prevent type mismatch
          const requestedSet = new Set(matches.map((m: any) => String(m.ride_id)));
          setRequestedRideIds(requestedSet);
        }
      }
      
      setLoading(false);
    }
    
    if (to && date && shift) fetchRides();
  }, [to, date, shift, friendsParam]);

  // Build the unified pickup string for the driver (Passenger + Friends)
  const getUnifiedPickupString = () => {
    let finalPickup = from;
    if (friendsParam) {
      const formattedFriends = friendsParam.split(',').join(', ');
      finalPickup += ` (+ ${formattedFriends})`;
    }
    return finalPickup;
  };

  // --- 1. THE BOOKING HANDSHAKE ---
  const handleBookSeat = async (rideId: string) => {
    setActionLoadingId(rideId);
    
    // 1. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/passenger/login");
      return;
    }

    // 2. Prep data
    const finalPickup = getUnifiedPickupString();
    const seatsNeeded = 1 + (friendsParam ? friendsParam.split(',').length : 0);

    // 3. Send to database
    const { error } = await supabase.from('trip_matches').insert([{
      ride_id: rideId,
      passenger_id: user.id,
      pickup_postcode: finalPickup,
      seats_needed: seatsNeeded,
      match_status: 'pending'
    }]);

    // 4. THE FIX: Update UI only if the database accepted it!
    if (!error) {
      setRequestedRideIds(prev => new Set(prev).add(String(rideId)));
    } else {
      alert("Failed to book seat. Please try again.");
    }
    
    // 5. Turn off the loading spinner
    setActionLoadingId(null);
  };
  // --- 2. CANCEL A REQUEST FROM SEARCH PAGE ---
  const handleCancelRequest = async (rideId: string) => {
    setActionLoadingId(rideId); // Reusing the same loading state for the spinner!
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // We delete the request entirely so the "Database Bouncer" lets them re-request it later if they change their mind
    const { error } = await supabase
      .from('trip_matches')
      .delete()
      .eq('ride_id', rideId)
      .eq('passenger_id', user.id)
      .eq('match_status', 'pending'); // Only delete if it's still pending!

    if (!error) {
      // Optimistic UI Update: Instantly remove it from the Set to show the Green button again
      setRequestedRideIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(String(rideId));
        return newSet;
      });
    } else {
      alert("Failed to cancel request. Please try again.");
    }
    
    setActionLoadingId(null);
  };

  // --- 2. THE BROADCAST HANDSHAKE (Jobs Board) ---
  const handleBroadcast = async () => {
    setActionLoadingId('broadcast');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/passenger/login");
      return;
    }

    const finalPickup = getUnifiedPickupString();
    const seatsNeeded = 1 + (friendsParam ? friendsParam.split(',').length : 0);

    const { error } = await supabase.from('open_requests').insert([{
      passenger_id: user.id,
      pickup_postcode: finalPickup,
      destination_hub: to,
      ride_date: date,
      shift_type: shift,
      seats_needed: seatsNeeded
    }]);

    if (!error) {
      setBroadcastSuccess(true);
    } else {
      alert("Failed to broadcast request.");
    }
    setActionLoadingId(null);
  };

  // Format the date for the UI
  const displayDate = date ? new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Route Summary Banner */}
      <div className="bg-emerald-600 rounded-[24px] p-5 text-white shadow-md shadow-emerald-600/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <MapPin className="h-24 w-24" />
        </div>
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">Searching Route</p>
          <h2 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">{to}</h2>
          <div className="flex items-center gap-3 text-sm font-bold text-emerald-100">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {displayDate}</span>
            <span>•</span>
            <span>{shift}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-sm font-bold text-gray-400 animate-pulse">Scanning driver routes...</p>
        </div>
      ) : rides.length === 0 ? (
        
        /* NO RIDES FOUND STATE */
        <div className="bg-white rounded-[24px] border border-gray-200 p-8 text-center shadow-sm">
          {broadcastSuccess ? (
            <div className="animate-in zoom-in slide-in-from-bottom-4">
              <div className="mx-auto h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border border-emerald-100">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="font-black text-gray-900 text-2xl mb-2 tracking-tight">Broadcast Sent!</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Your request has been beamed to our driver network. We will notify you the moment a driver accepts your trip.
              </p>
              <Link href="/passenger/dashboard" className="w-full block bg-gray-900 text-white font-black py-4 rounded-xl shadow-md hover:bg-gray-800 transition-colors">
                Track on Dashboard
              </Link>
            </div>
          ) : (
            <div className="animate-in fade-in">
              <div className="mx-auto h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-5 border border-gray-100">
                <AlertCircle className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="font-black text-gray-900 text-2xl mb-2 tracking-tight">No Matches Yet</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                There are no drivers scheduled for this exact route and time. Broadcast your request to alert drivers of the available job.
              </p>
              <button 
                onClick={handleBroadcast} 
                disabled={actionLoadingId === 'broadcast'}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-70"
              >
                {actionLoadingId === 'broadcast' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rss className="h-5 w-5" />}
                Broadcast to Drivers
              </button>
            </div>
          )}
        </div>
      ) : (
        
        /* RIDES FOUND STATE */
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{rides.length} Drivers Available</h3>
          
          {rides.map((ride) => (
            <div key={ride.id} className="bg-white rounded-[24px] border-2 border-emerald-50 shadow-sm hover:border-emerald-200 transition-all overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="p-5 space-y-4">
                
                {/* Driver Info Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 font-black text-xl border border-emerald-200">
                      {ride.driver_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-lg leading-none mb-1">{ride.driver_name}</h4>
                      <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-widest">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Price</p>
                    <p className="font-black text-2xl text-gray-900 leading-none">£{ride.price.toFixed(2)}</p>
                  </div>
                </div>
                
                {/* Ride Details Card */}
                <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center border border-gray-100">
                  <div className="flex items-center gap-2">
                     <Car className="h-5 w-5 text-gray-400" />
                     <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Vehicle</p>
                       <p className="font-black text-gray-700 text-sm leading-tight">{ride.vehicle}</p>
                     </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Seats Left</p>
                    <p className="font-black text-emerald-600 text-sm leading-tight">{ride.remaining_seats} / {ride.total_seats_capacity}</p>
                  </div>
                </div>

                {/* Action Button: Checks if they already requested this specific ride */}
             {/* THE FIX: Wrap ride.id in String() right here 👇 */}
              {requestedRideIds.has(String(ride.id)) ? (
  /* THE UPGRADE: Active Cancel Button instead of a disabled one */
  <button 
    onClick={() => handleCancelRequest(ride.id)}
    disabled={actionLoadingId === ride.id}
    className="w-full bg-red-50 text-red-600 border-2 border-red-200 py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-70 active:scale-[0.98] shadow-sm"
  >
    {actionLoadingId === ride.id ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : (
      <XCircle className="h-5 w-5" />
    )}
    Cancel Request
  </button>
) : (
  /* Standard Request Button */
  <button 
    onClick={() => handleBookSeat(ride.id)} 
    disabled={actionLoadingId === ride.id}
    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 shadow-md shadow-emerald-600/20"
  >
    {actionLoadingId === ride.id ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : (
      "Request Seat"
    )}
  </button>
)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sleek Minimal Header */}
      <header className="bg-gray-50/90 backdrop-blur sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <Link href="/search" className="p-2 -ml-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-black text-gray-900 tracking-tight">Available Routes</h1>
      </header>

      <main className="max-w-md mx-auto p-4 pt-2">
        <Suspense fallback={
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="text-sm font-bold text-gray-400 animate-pulse">Loading connection...</p>
          </div>
        }>
          <ResultsLogic />
        </Suspense>
      </main>
    </div>
  );
}