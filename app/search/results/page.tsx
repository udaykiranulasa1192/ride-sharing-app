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
  Tag,
  X,
  Lock,
  LayoutDashboard,
  Map,
  Users,
  Clock,
  UserPlus,
  Radio,
  Search,
  Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PassengerAuthForm from "@/components/PassengerAuthForm";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import { calculateTripPrice } from "@/lib/pricing";

function ResultsLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const date = searchParams.get("date") || "";
  const shift = searchParams.get("shift") || "";
  const friendsParam = searchParams.get("friends") || "";
  const tripTypeParam = searchParams.get("trip_type") || "two_way";
  
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");

  const [rides, setRides] = useState<any[]>([]);
  const [existingBroadcasts, setExistingBroadcasts] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // --- UPGRADED BROADCAST STATES ---
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any | null>(null); 
  
  // --- SURGE BOOST PRICING STATE ---
  const [baseFare, setBaseFare] = useState<number>(0);
  const [customOffer, setCustomOffer] = useState<number>(0);
  
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [userRideStatuses, setUserRideStatuses] = useState<Record<string, string>>({});
  const [hasConfirmedShift, setHasConfirmedShift] = useState(false); 

  const friendsList = friendsParam ? friendsParam.split(',') : [];
  const totalSeatsNeeded = 1 + friendsList.length;

  const fetchRidesAndAuth = async () => {
    setLoading(true);
    setPageError(null);

    let baseEstimatedPrice = 0;
    let pricingMethod = 'base';
    let dropoffLat = 0;
    let dropoffLng = 0;
    let pickupLat = lat;
    let pickupLng = lng;

    try {
      // 1. PRICING ENGINE 
      const { data: workplaceData } = await supabase
        .from('workplaces')
        .select('*')
        .ilike('name', `%${to.trim()}%`)
        .maybeSingle(); 

      let finalCalculatedFare = 0;

      if (workplaceData && workplaceData.fixed_price) {
        baseEstimatedPrice = parseFloat(workplaceData.fixed_price);
        pricingMethod = 'fixed';
        finalCalculatedFare = baseEstimatedPrice * totalSeatsNeeded;
      } else {
        const cleanTo = to.replace(/[^a-zA-Z0-9]/g, '');
        const dropRes = await fetch(`https://api.postcodes.io/postcodes/${cleanTo}`);
        const dropData = await dropRes.json();

        if (dropData.status === 200) {
          dropoffLat = dropData.result.latitude;
          dropoffLng = dropData.result.longitude;
        }

        if (!pickupLat || !pickupLng) {
          const cleanFrom = from.replace(/[^a-zA-Z0-9]/g, '');
          const pickRes = await fetch(`https://api.postcodes.io/postcodes/${cleanFrom}`);
          const pickData = await pickRes.json();
          if (pickData.status === 200) {
            pickupLat = pickData.result.latitude;
            pickupLng = pickData.result.longitude;
          }
        }

        if (pickupLat && dropoffLat) {
          baseEstimatedPrice = calculateTripPrice(pickupLat, pickupLng, dropoffLat, dropoffLng, 1);
          pricingMethod = 'calculated';
          const tripMultiplier = (tripTypeParam === 'round_trip' || tripTypeParam === 'two_way') ? 2 : 1;
          finalCalculatedFare = baseEstimatedPrice * totalSeatsNeeded * tripMultiplier;
        } else {
          setPageError("Location unrecognized. Please select a valid location from the suggested options or enter a full UK postcode.");
          setLoading(false);
          return; 
        }
      }

      // Initialize the Base Fare for Surge Buttons
      setBaseFare(finalCalculatedFare);
      setCustomOffer(finalCalculatedFare);

      // 2. FETCH OPEN REQUESTS
      const { data: openReqs } = await supabase
        .from('open_requests')
        .select('*')
        .ilike('destination_hub', `%${to.trim()}%`)
        .eq('ride_date', date)
        .eq('shift_type', shift)
        .eq('status', 'open');

      // 3. FETCH AVAILABLE DRIVERS
      const { data: ridesData } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .gte('remaining_seats', totalSeatsNeeded)
        .eq('ride_date', date)
        .eq('departure_time', shift)
        .ilike('destination_hub', `%${to}%`);

      if (ridesData) {
        const pricedRides = ridesData.map(ride => ({
          ...ride,
          dynamic_price: finalCalculatedFare,
          pricing_method: pricingMethod
        }));
        setRides(pricedRides);
      }

      // 4. CHECK USER AUTH & EXISTING BROADCASTS
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);

        const { data: matches } = await supabase
          .from('trip_matches')
          .select(`ride_id, match_status, rides!inner(ride_date, departure_time)`)
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
        }

        if (openReqs) {
          const userExistingReq = openReqs.find(req => req.passenger_id === user.id);
          
          if (userExistingReq) {
             setBroadcastSuccess(true);
             setActiveRequest(userExistingReq); 
             setCustomOffer(userExistingReq.calculated_price);
          }

          const validPools = openReqs.filter(req => 
            (req.seats_needed + totalSeatsNeeded) <= 4 && 
            req.passenger_id !== user.id
          );
          setExistingBroadcasts(validPools);
        }

      } else {
        setIsLoggedIn(false);
        if (openReqs) {
          const validPools = openReqs.filter(req => (req.seats_needed + totalSeatsNeeded) <= 4);
          setExistingBroadcasts(validPools);
        }
      }
      
    } catch (error) {
      console.error(error);
      setPageError("We encountered a network error calculating the route. Please try again.");
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
    if (!isLoggedIn) return setShowLoginModal(true);
    setActionLoadingId(rideId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('trip_matches').insert([{
      ride_id: rideId,
      passenger_id: user.id,
      pickup_postcode: getUnifiedPickupString(),
      seats_needed: totalSeatsNeeded,
      match_status: 'pending' 
    }]);

    if (!error) {
      setUserRideStatuses(prev => ({ ...prev, [String(rideId)]: 'pending' }));
    } else {
      alert("Failed to book seat. Please try again.");
    }
    setActionLoadingId(null);
  };

  const handleJoinBroadcast = async (req: any) => {
    if (!isLoggedIn) return setShowLoginModal(true);
    setActionLoadingId(req.id);
    
    const newSeats = req.seats_needed + totalSeatsNeeded;
    const newPrice = req.calculated_price + customOffer; 
    
    const mergedPickups = `${req.pickup_postcode} | ${getUnifiedPickupString()}`;

    const { error } = await supabase
      .from('open_requests')
      .update({
        seats_needed: newSeats,
        calculated_price: newPrice,
        pickup_postcode: mergedPickups 
      })
      .eq('id', req.id);

    if (!error) {
      setBroadcastSuccess(true);
      setActiveRequest({
        ...req,
        seats_needed: newSeats,
        calculated_price: newPrice,
        pickup_postcode: mergedPickups
      });
    } else {
      alert("Failed to join request.");
    }
    setActionLoadingId(null);
  };

  const handleBroadcast = async () => {
    if (!isLoggedIn) return setShowLoginModal(true);
    setActionLoadingId('broadcast');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase.from('open_requests').insert([{
        passenger_id: user.id,
        pickup_postcode: getUnifiedPickupString(),
        destination_hub: to,
        pickup_latitude: lat,
        pickup_longitude: lng,
        ride_date: date,
        shift_type: shift,
        seats_needed: totalSeatsNeeded,
        calculated_price: customOffer 
      }]).select().single();

      if (!error && data) {
        setBroadcastSuccess(true);
        setActiveRequest(data); 
      } else {
        alert("Failed to broadcast request.");
      }
    } catch (err) {
      console.error(err);
    }
    setActionLoadingId(null);
  };

  const cancelActiveRequest = async () => {
    if (!activeRequest) return;
    setActionLoadingId('cancel_broadcast');
    
    const { error } = await supabase
      .from('open_requests')
      .delete()
      .eq('id', activeRequest.id);

    if (!error) {
      setBroadcastSuccess(false);
      setActiveRequest(null);
    } else {
      alert("Could not cancel request. Please try again.");
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

  if (pageError && !loading) return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 mt-8">
      <div className="bg-white rounded-[24px] border border-red-100 p-8 text-center shadow-sm max-w-md mx-auto">
        <div className="mx-auto h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border border-red-100">
          <Map className="h-10 w-10 text-red-500" />
        </div>
        <h3 className="font-black text-gray-900 text-2xl mb-2 tracking-tight">Location Unrecognized</h3>
        <p className="text-gray-600 text-sm mb-8 leading-relaxed font-medium">{pageError}</p>
        <Link href="/search" className="w-full flex justify-center items-center gap-2 bg-gray-900 text-white font-black py-4 rounded-xl shadow-md hover:bg-gray-800 transition-colors active:scale-95">
          <ArrowLeft className="h-5 w-5" /> Return to Search
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      
      <div className="bg-gray-900 rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5"><MapPin className="h-32 w-32" /></div>
        <div className="relative z-10 space-y-4">
          
          <div className="flex justify-between items-start">
            <h2 className="text-3xl font-black tracking-tight leading-none text-emerald-400">{to}</h2>
            <div className="bg-gray-800 border border-gray-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-inner">
               <Users className="h-3 w-3 text-emerald-400" />
               <span className="text-xs font-bold text-gray-200">{totalSeatsNeeded} Passenger{totalSeatsNeeded > 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 flex divide-x divide-gray-700">
            <div className="flex-1 pr-3 flex flex-col justify-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Date</p>
              <p className="text-sm font-bold flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-emerald-400" /> {displayDate}</p>
            </div>
            <div className="flex-1 pl-3 flex flex-col justify-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Shift</p>
              <p className="text-sm font-bold flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-400" /> {shift}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-sm font-bold text-gray-400 animate-pulse">Calculating optimal routes...</p>
        </div>
      ) : rides.length === 0 ? (
        
        <div className="bg-white rounded-[24px] border border-gray-200 p-5 shadow-sm space-y-6">
          
          {broadcastSuccess && activeRequest ? (
            
            <div className="animate-in zoom-in slide-in-from-bottom-4">
              <div className="bg-white border-2 border-emerald-500 rounded-[20px] overflow-hidden shadow-lg shadow-emerald-600/10 text-left relative">
                
                <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                  <Radio className="h-32 w-32 text-emerald-600" />
                </div>
                
                <div className="p-5 border-b border-emerald-50 flex justify-between items-start relative z-10">
                  <div>
                    <h4 className="font-black text-gray-900 text-xl mb-1 tracking-tight">Looking for Driver</h4>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Broadcasting...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Offered Fare</p>
                    <p className="font-black text-2xl text-emerald-600 leading-none">£{activeRequest.calculated_price.toFixed(2)}</p>
                  </div>
                </div>

                <div className="p-5 bg-emerald-50/30 relative z-10">
                  <div className="grid grid-cols-2 gap-4 mb-5 bg-white rounded-xl p-3 border border-emerald-100/50 shadow-sm">
                    <div>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Shift</p>
                       <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-500"/> {activeRequest.shift_type}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Date</p>
                       <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-emerald-500"/> {new Date(activeRequest.ride_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short'})}</p>
                    </div>
                  </div>

                  <div className="relative pl-6 space-y-4">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-emerald-200 rounded-full"></div>
                    
                    <div className="relative">
                      <div className="absolute -left-6 top-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-emerald-50 shadow-sm"></div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pickups ({activeRequest.seats_needed} Seats)</p>
                      <div className="flex flex-col gap-1.5">
                        {activeRequest.pickup_postcode.split('|').map((loc: string, i: number) => (
                          <span key={i} className="text-sm font-bold text-gray-900 leading-tight">{loc.trim()}</span>
                        ))}
                      </div>
                    </div>

                    <div className="relative pt-2">
                      <div className="absolute -left-6 top-3 h-3 w-3 bg-gray-900 rounded-sm border-2 border-emerald-50 shadow-sm"></div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destination</p>
                      <p className="text-sm font-black text-gray-900 leading-tight">{activeRequest.destination_hub}</p>
                    </div>
                  </div>
                </div>

                {/* THE UNBLOCKING UI: Search Again is now the Primary Call to Action */}
                <div className="p-4 bg-white relative z-10 border-t border-emerald-50 flex flex-col gap-3">
                   <Link href="/search" className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-colors text-center flex items-center justify-center gap-2 active:scale-[0.98]">
                      <Search className="h-5 w-5" /> Search Another Route
                   </Link>
                   <div className="flex gap-2">
                     <Link href="/passenger/dashboard" className="flex-1 bg-gray-100 text-gray-700 font-black py-3 rounded-xl hover:bg-gray-200 transition-colors text-center flex items-center justify-center gap-2">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                     </Link>
                     <button 
                      onClick={cancelActiveRequest}
                      disabled={actionLoadingId === 'cancel_broadcast'}
                      className="flex-1 bg-red-50 text-red-600 border border-red-100 font-black py-3 rounded-xl hover:bg-red-100 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                     >
                      {actionLoadingId === 'cancel_broadcast' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Revoke
                     </button>
                   </div>
                </div>
              </div>
            </div>

          ) : (
            
            <div className="animate-in fade-in space-y-6">
              
              <div className="text-center">
                <div className="mx-auto h-14 w-14 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-gray-100">
                  <Rss className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="font-black text-gray-900 text-xl tracking-tight">Request Available Drivers</h3>
                <p className="text-gray-500 text-sm leading-relaxed mt-1">
                  No drivers found. Broadcast your route and drivers will claim it.
                </p>
              </div>

              {/* --- PROFESSIONAL SURGE BOOST UI --- */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 shadow-inner">
                 <div className="flex justify-between items-end mb-3">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Driver Incentive</label>
                   <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                     <Car className="h-3 w-3" /> Base: £{baseFare.toFixed(2)}
                   </span>
                 </div>

                 {/* Surge Chips */}
                 <div className="grid grid-cols-3 gap-2 mb-3">
                   <button 
                     onClick={() => setCustomOffer(baseFare)} 
                     className={`py-2.5 rounded-xl text-[11px] sm:text-xs font-black border-2 transition-all ${customOffer === baseFare ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-200'}`}
                   >
                     Standard
                   </button>
                   <button 
                     onClick={() => setCustomOffer(baseFare + 2)} 
                     className={`py-2.5 rounded-xl text-[11px] sm:text-xs font-black border-2 transition-all flex items-center justify-center gap-1 ${customOffer === baseFare + 2 ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-200'}`}
                   >
                     <Zap className="h-3 w-3" /> + £2 Fast
                   </button>
                   <button 
                     onClick={() => setCustomOffer(baseFare + 5)} 
                     className={`py-2.5 rounded-xl text-[11px] sm:text-xs font-black border-2 transition-all flex items-center justify-center gap-1 ${customOffer === baseFare + 5 ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-200'}`}
                   >
                     <Zap className="h-3 w-3" /> + £5 Urgent
                   </button>
                 </div>

                 <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl px-4 py-3 shadow-sm ring-1 ring-emerald-500/10">
                   <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Offer</span>
                   <span className="text-3xl font-black text-emerald-600">£{customOffer.toFixed(2)}</span>
                 </div>
              </div>

              <button 
                onClick={handleBroadcast} 
                disabled={actionLoadingId === 'broadcast' || hasConfirmedShift}
                className="w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-gray-800 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {actionLoadingId === 'broadcast' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rss className="h-5 w-5" />}
                {hasConfirmedShift ? "Shift Already Booked" : "Broadcast Route"}
              </button>

              {existingBroadcasts.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-2 bg-emerald-50 rounded-full py-1">Carpool Opportunities Available</span>
                  </div>

                  {existingBroadcasts.map(req => {
                    const currentPassengers = req.seats_needed;
                    const spotsLeft = 4 - currentPassengers;
                    const allPickups = req.pickup_postcode.split('|');

                    return (
                      <div key={req.id} className="bg-white border-2 border-gray-100 hover:border-emerald-200 rounded-2xl overflow-hidden shadow-sm transition-all text-left">
                        
                        <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-gray-900 text-lg mb-0.5">Shift Carpool</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentPassengers} Passenger(s) Waiting</p>
                          </div>
                          <div className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-lg border border-emerald-100">
                            {spotsLeft} Spots Left
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50/50">
                          <div className="relative pl-6 space-y-4">
                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200 rounded-full"></div>
                            
                            <div className="relative">
                              <div className="absolute -left-6 top-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm ring-1 ring-emerald-500/20"></div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Current Pickups</p>
                              <div className="flex flex-col gap-1">
                                {allPickups.map((loc: string, i: number) => (
                                  <span key={i} className="text-sm font-bold text-gray-900 leading-tight">{loc.trim()}</span>
                                ))}
                              </div>
                            </div>

                            <div className="relative pt-1">
                              <div className="absolute -left-6 top-2 h-3 w-3 bg-gray-900 rounded-sm border-2 border-white shadow-sm ring-1 ring-gray-900/20"></div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Destination</p>
                              <p className="text-sm font-bold text-gray-900 leading-tight">{to}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4">
                           <button 
                            onClick={() => handleJoinBroadcast(req)}
                            disabled={actionLoadingId === req.id || spotsLeft < totalSeatsNeeded}
                            className="w-full bg-emerald-600 text-white font-black py-3.5 rounded-xl shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                           >
                            {actionLoadingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            {spotsLeft < totalSeatsNeeded ? 'Not Enough Room' : `Join Pool for £${customOffer.toFixed(2)}`}
                           </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}
        </div>
      ) : (
        
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{rides.length} Driver(s) Scheduled</h3>
          
          {rides.map((ride) => {
            const rideStatus = userRideStatuses[String(ride.id)];

            return (
              <div key={ride.id} className={`bg-white rounded-[24px] shadow-sm transition-all overflow-hidden animate-in slide-in-from-bottom-4 relative ${rideStatus === 'confirmed' ? 'border-2 border-emerald-500' : 'border-2 border-gray-100 hover:border-emerald-200'}`}>
                
                {ride.pricing_method === 'fixed' && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-bl-lg shadow-sm flex items-center gap-1 z-10">
                    <Tag className="h-2.5 w-2.5" /> Platform Fare
                  </div>
                )}

                <div className="p-5 space-y-5 pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-black text-xl shadow-inner">
                        {ride.driver_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-lg leading-none mb-1">{ride.driver_name}</h4>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-widest">
                          <ShieldCheck className="h-3 w-3" /> Verified Driver
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Your Fare</p>
                      <p className="font-black text-2xl text-emerald-600 leading-none">£{ride.dynamic_price?.toFixed(2)}</p>
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
                  ) : hasConfirmedShift ? (
                    <button disabled className="w-full bg-gray-100 text-gray-400 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-colors">
                      <Lock className="h-5 w-5" /> Shift Already Booked
                    </button>
                  ) : (
                    <button onClick={() => handleBookSeat(ride.id)} disabled={actionLoadingId === ride.id} className="w-full bg-gray-900 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 shadow-md">
                      {actionLoadingId === ride.id ? <Loader2 className="h-5 w-5 animate-spin" /> : `Request ${totalSeatsNeeded} Seat(s)`}
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
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Search Results</h1>
        </div>
        <Link href="/passenger/dashboard" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm flex items-center gap-2 active:scale-95">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      </header>

      <main className="max-w-md mx-auto p-4 pt-4">
        <Suspense fallback={<div className="py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-emerald-600" /></div>}>
          <ResultsLogic />
        </Suspense>
      </main>

      <PassengerBottomNav />
    </div>
  );
}