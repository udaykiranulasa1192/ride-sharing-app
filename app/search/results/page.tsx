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
  AlertCircle,
  X,
  Lock,
  LayoutDashboard
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PassengerAuthForm from "@/components/PassengerAuthForm";
import PassengerBottomNav from "@/components/PassengerBottomNav";
// --- THE UPGRADE: Import our new Pricing Engine! ---
import { calculateTripPrice } from "@/lib/pricing";

function ResultsLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const date = searchParams.get("date") || "";
// Near the top of ResultsLogic:
const shift = searchParams.get("shift") || "";
const friendsParam = searchParams.get("friends") || "";
// THE FIX: Changed the fallback to 'two_way'
const tripTypeParam = searchParams.get("trip_type") || "two_way";
  
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [calculatedFare, setCalculatedFare] = useState<number | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [userRideStatuses, setUserRideStatuses] = useState<Record<string, string>>({});
  const [hasConfirmedShift, setHasConfirmedShift] = useState(false); 
  

  const fetchRidesAndAuth = async () => {
    setLoading(true);
    const friendsList = friendsParam ? friendsParam.split(',') : [];
    const totalSeatsNeeded = 1 + friendsList.length;

    const { data: ridesData } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'active')
      .gte('remaining_seats', totalSeatsNeeded)
      .eq('ride_date', date)
      .eq('departure_time', shift)
      .ilike('destination_hub', `%${to}%`);

    if (ridesData) setRides(ridesData);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setIsLoggedIn(true);
      
      const { data: matches } = await supabase
        .from('trip_matches')
        .select(`
          ride_id,
          match_status,
          rides!inner(ride_date, departure_time)
        `)
        .eq('passenger_id', user.id)
        .in('match_status', ['pending', 'confirmed'])
        .eq('rides.ride_date', date)
        .eq('rides.departure_time', shift);
      
      if (matches && matches.length > 0) {
        const statusMap: Record<string, string> = {};
        let isConfirmed = false;
        
        matches.forEach((m: any) => {
          statusMap[String(m.ride_id)] = m.match_status;
          if (m.match_status === 'confirmed') isConfirmed = true; 
        });
        
        setUserRideStatuses(statusMap);
        setHasConfirmedShift(isConfirmed); 
      } else {
        setUserRideStatuses({});
        setHasConfirmedShift(false);
      }
    } else {
      setIsLoggedIn(false);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (to && date && shift) fetchRidesAndAuth();
  }, [to, date, shift, friendsParam]);

  const getUnifiedPickupString = () => {
    let finalPickup = from;
    if (friendsParam) {
      const formattedFriends = friendsParam.split(',').join(', ');
      finalPickup += ` (+ ${formattedFriends})`;
    }
    return finalPickup;
  };

  const handleBookSeat = async (rideId: string) => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    setActionLoadingId(rideId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const finalPickup = getUnifiedPickupString();
    const seatsNeeded = 1 + (friendsParam ? friendsParam.split(',').length : 0);

    const { error } = await supabase.from('trip_matches').insert([{
      ride_id: rideId,
      passenger_id: user.id,
      pickup_postcode: finalPickup,
      seats_needed: seatsNeeded,
      match_status: 'pending' 
    }]);

    if (!error) {
      setUserRideStatuses(prev => ({ ...prev, [String(rideId)]: 'pending' }));
    } else {
      alert("Failed to book seat. Please try again.");
    }
    setActionLoadingId(null);
  };

  // --- THE UPGRADE: Smart Algorithmic Broadcast ---
  const handleBroadcast = async () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    setActionLoadingId('broadcast');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const finalPickup = getUnifiedPickupString();
    const cleanPickupPostcode = from.replace(/[^a-zA-Z0-9]/g, ''); // Clean for API
    const seatsNeeded = 1 + (friendsParam ? friendsParam.split(',').length : 0);

    try {
      // 1. Ask postcodes.io for the Passenger's exact coordinates (100% Free)
      const pickupRes = await fetch(`https://api.postcodes.io/postcodes/${cleanPickupPostcode}`);
      const pickupData = await pickupRes.json();
      
      if (pickupData.status !== 200) {
        alert("We couldn't verify your pickup postcode. Please check it and try again.");
        setActionLoadingId(null);
        return;
      }
      
      const pickupLat = pickupData.result.latitude;
      const pickupLng = pickupData.result.longitude;

      // 2. Check if the Destination Hub exists in our Database
      const { data: hubData } = await supabase
        .from('destination_hubs')
        .select('*')
        .ilike('hub_name', `%${to}%`)
        .single();

      let dropoffLat = 0;
      let dropoffLng = 0;
      let finalPrice = 0;
      let hubId = null;

      if (hubData) {
        // We know this hub! 
        dropoffLat = hubData.latitude;
        dropoffLng = hubData.longitude;
        hubId = hubData.id;

        // Use the hardcoded fixed price if you set one, otherwise let the math do it!
        if (hubData.fixed_price) {
          finalPrice = parseFloat(hubData.fixed_price);
        } else {
          finalPrice = calculateTripPrice(pickupLat, pickupLng, dropoffLat, dropoffLng, seatsNeeded);
        }
      } else {
        // Fallback: If it's a new location, try treating 'to' as a postcode
        const cleanDropoffPostcode = to.replace(/[^a-zA-Z0-9]/g, '');
        const dropRes = await fetch(`https://api.postcodes.io/postcodes/${cleanDropoffPostcode}`);
        const dropData = await dropRes.json();

        if (dropData.status === 200) {
          dropoffLat = dropData.result.latitude;
          dropoffLng = dropData.result.longitude;
          finalPrice = calculateTripPrice(pickupLat, pickupLng, dropoffLat, dropoffLng, seatsNeeded);
        } else {
          // Absolute last resort: Standard flat rate if the API fails
          finalPrice = 10.00 * seatsNeeded; 
        }
      }

      // 3. Save EVERYTHING to the jobs board
      const { error } = await supabase.from('open_requests').insert([{
        passenger_id: user.id,
        pickup_postcode: finalPickup,
        destination_hub: to,
        destination_hub_id: hubId, // Links it properly in DB!
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        ride_date: date,
        shift_type: shift,
        seats_needed: seatsNeeded,
        calculated_price: finalPrice // The Driver will see this exact number!
      }]);

      if (!error) {
        setCalculatedFare(finalPrice);
        setBroadcastSuccess(true);
      } else {
        alert("Failed to broadcast request.");
      }

    } catch (err) {
      console.error(err);
      alert("Something went wrong calculating your route.");
    }

    setActionLoadingId(null);
  };

  const handleCancelRequest = async (rideId: string) => {
    setActionLoadingId(rideId); 
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('trip_matches')
      .delete()
      .eq('ride_id', rideId)
      .eq('passenger_id', user.id)
      .eq('match_status', 'pending'); 

    if (!error) {
      setUserRideStatuses(prev => {
        const next = { ...prev };
        delete next[String(rideId)];
        return next;
      });
    } else {
      alert("Failed to cancel request. Please try again.");
    }
    setActionLoadingId(null);
  };

  const handleLoginSuccess = async () => {
    setShowLoginModal(false);
    await fetchRidesAndAuth(); 
  };

  const displayDate = date ? new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  return (
    <div className="space-y-6 animate-in fade-in">
      
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
        
        <div className="bg-white rounded-[24px] border border-gray-200 p-8 text-center shadow-sm">
          {broadcastSuccess ? (
            <div className="animate-in zoom-in slide-in-from-bottom-4">
              <div className="mx-auto h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border border-emerald-100">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="font-black text-gray-900 text-2xl mb-1 tracking-tight">Broadcast Sent!</h3>
              {/* Show the passenger their generated fare! */}
              <p className="font-black text-emerald-600 text-xl mb-4">Estimated Fare: £{calculatedFare?.toFixed(2)}</p>
              
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
                disabled={actionLoadingId === 'broadcast' || hasConfirmedShift}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {actionLoadingId === 'broadcast' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rss className="h-5 w-5" />}
                {hasConfirmedShift ? "Shift Already Booked" : "Broadcast to Drivers"}
              </button>
            </div>
          )}
        </div>
      ) : (
        
        /* ... Render rides (exact same as before) ... */
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{rides.length} Drivers Available</h3>
          
          {rides.map((ride) => {
            const rideStatus = userRideStatuses[String(ride.id)];
            const isLockedOut = hasConfirmedShift && rideStatus !== 'confirmed';

            return (
              <div key={ride.id} className={`bg-white rounded-[24px] shadow-sm transition-all overflow-hidden animate-in slide-in-from-bottom-4 ${rideStatus === 'confirmed' ? 'border-2 border-emerald-500' : 'border-2 border-emerald-50 hover:border-emerald-200'}`}>
                <div className="p-5 space-y-4">
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

                  {rideStatus === 'confirmed' ? (
                    <Link href="/passenger/dashboard" className="w-full bg-emerald-50 text-emerald-700 border-2 border-emerald-200 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-colors shadow-sm">
                      <CheckCircle className="h-5 w-5" /> Trip Confirmed!
                    </Link>
                  ) : rideStatus === 'pending' ? (
                    <button onClick={() => handleCancelRequest(ride.id)} disabled={actionLoadingId === ride.id} className="w-full bg-red-50 text-red-600 border-2 border-red-200 py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-70 active:scale-[0.98] shadow-sm">
                      {actionLoadingId === ride.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />} Cancel Request
                    </button>
                  ) : isLockedOut ? (
                    <button disabled className="w-full bg-gray-100 text-gray-400 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-colors">
                      <Lock className="h-5 w-5" /> Shift Already Booked
                    </button>
                  ) : (
                    <button onClick={() => handleBookSeat(ride.id)} disabled={actionLoadingId === ride.id} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 shadow-md shadow-emerald-600/20">
                      {actionLoadingId === ride.id ? <Loader2 className="h-5 w-5 animate-spin" /> : "Request Seat"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 animate-in fade-in">
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowLoginModal(false)} className="absolute -top-12 right-0 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-all z-50">
              <X className="h-6 w-6" />
            </button>
            <PassengerAuthForm onSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      <header className="bg-gray-50/90 backdrop-blur sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/search" className="p-2 -ml-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Available Routes</h1>
        </div>
        
        <Link 
          href="/passenger/dashboard" 
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm flex items-center gap-2 active:scale-95"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
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

      <PassengerBottomNav />
    </div>
  );
}