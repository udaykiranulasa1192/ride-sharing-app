"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  MapPin, 
  Clock, 
  Users, 
  Loader2, 
  Car, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  MessageCircle,
  AlertTriangle,
  X,
  LayoutDashboard,
  Wallet,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import DriverNav from "@/components/DriverNav";
import PassengerAuthForm from "@/components/PassengerAuthForm"; // Added to fix the auth wall

export default function DriverDashboard() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [myRides, setMyRides] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [passengerProfiles, setPassengerProfiles] = useState<Record<string, any>>({});

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rideToCancel, setRideToCancel] = useState<string | null>(null);

  // Toast Notification State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch active rides (FILTERED BY DATE >= TODAY)
      const { data: ridesData } = await supabase
        .from('rides')
        .select(`
          *,
          trip_matches (
            id, pickup_postcode, seats_needed, match_status, passenger_id
          )
        `)
        .eq('driver_id', user.id)
        .in('status', ['active', 'full'])
        .gte('ride_date', today)
        .order('ride_date', { ascending: true });

      // 2. Fetch pending requests (FILTERED BY DATE >= TODAY)
      const { data: requestsData } = await supabase
        .from('trip_matches')
        .select(`
          *,
          rides!inner(driver_id, departure_time, destination_hub, ride_date)
        `)
        .eq('rides.driver_id', user.id)
        .eq('match_status', 'pending')
        .gte('rides.ride_date', today);

      // 3. Gather profiles
      const passengerIds = new Set<string>();
      ridesData?.forEach(ride => {
        ride.trip_matches?.forEach((match: any) => {
          if (match.passenger_id) passengerIds.add(match.passenger_id);
        });
      });
      requestsData?.forEach(req => {
        if (req.passenger_id) passengerIds.add(req.passenger_id);
      });

      if (passengerIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('passenger_profiles')
          .select('id, first_name, last_name, mobile_number')
          .in('id', Array.from(passengerIds));

        const pMap: Record<string, any> = {};
        profilesData?.forEach(p => { pMap[p.id] = p; });
        setPassengerProfiles(pMap);
      }

      if (ridesData) setMyRides(ridesData);
      if (requestsData) setPendingRequests(requestsData);

    } catch (error) {
      console.error("Dashboard Error:", error);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }

  const handleAccept = async (req: any) => {
    setProcessingId(req.id);
    
    const requestId = req.id;
    const rideId = req.ride_id;
    const seatsNeeded = req.seats_needed;
    const passengerId = req.passenger_id;
    const rideDate = req.rides?.ride_date;
    const departureTime = req.rides?.departure_time;

    // The Ghost Check
    const { data: checkReq, error: checkError } = await supabase
      .from('trip_matches')
      .select('match_status')
      .eq('id', requestId)
      .single();

    if (checkError || !checkReq || checkReq.match_status !== 'pending') {
      setErrorMessage("Oops! Another driver just accepted this passenger.");
      await fetchDashboardData(); 
      setProcessingId(null);
      return; 
    }

    const { data: rideData } = await supabase.from('rides').select('remaining_seats, total_seats_capacity').eq('id', rideId).single();
    
    if (rideData) {
      const newSeats = rideData.remaining_seats - seatsNeeded;
      
      // Update Seats & Mark Full if necessary
      const newStatus = newSeats <= 0 ? 'full' : 'active';
      await supabase.from('rides').update({ remaining_seats: newSeats, status: newStatus }).eq('id', rideId);
      
      await supabase.from('trip_matches').update({ match_status: 'confirmed' }).eq('id', requestId);
      
      // Auto-Cleanups
      if (passengerId && rideDate) {
        await supabase.from('open_requests').delete().eq('passenger_id', passengerId).eq('ride_date', rideDate);
      }
      if (passengerId && rideDate && departureTime) {
        const { data: otherPendingRequests } = await supabase
          .from('trip_matches')
          .select('id, rides!inner(ride_date, departure_time)')
          .eq('passenger_id', passengerId)
          .eq('match_status', 'pending')
          .eq('rides.ride_date', rideDate)
          .eq('rides.departure_time', departureTime);

        if (otherPendingRequests && otherPendingRequests.length > 0) {
          const idsToDelete = otherPendingRequests.map(pReq => pReq.id);
          await supabase.from('trip_matches').delete().in('id', idsToDelete);
        }
      }

      await fetchDashboardData();
    }
    setProcessingId(null);
  };

  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    await supabase.from('trip_matches').update({ match_status: 'declined' }).eq('id', requestId);
    await fetchDashboardData();
    setProcessingId(null);
  };

  const triggerCancelWarning = (rideId: string) => {
    setRideToCancel(rideId);
    setCancelModalOpen(true);
  };

  const confirmCancelTrip = async () => {
    if (!rideToCancel) return;
    setProcessingId(rideToCancel);
    
    await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideToCancel);
    await supabase.from('trip_matches').update({ match_status: 'cancelled' }).eq('ride_id', rideToCancel);
    
    await fetchDashboardData();
    
    setProcessingId(null);
    setCancelModalOpen(false);
    setRideToCancel(null);
  };

  // Bulletproof Date Formatter
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );

  // --- FIXED AUTH WALL ---
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-50 p-4 pb-32">
      <div className="max-w-md mx-auto pt-16 text-center">
        <div className="h-16 w-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <LayoutDashboard className="h-8 w-8 text-gray-900" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Driver Portal</h2>
        <p className="text-gray-500 text-sm mb-10">Sign in to manage your routes and earnings.</p>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <PassengerAuthForm onSuccess={fetchDashboardData} />
        </div>
      </div>
      <DriverNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32 relative">
      
      {/* Toast Notification */}
      {errorMessage && (
        <div className="fixed top-4 left-0 right-0 z-[200] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-gray-900 text-white rounded-xl p-3 shadow-xl flex items-center gap-3 w-full max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="flex-1 text-sm font-semibold">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="text-gray-400 hover:text-white p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-5 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Driver Console</h1>
          </div>
          <Link href="/driver" className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 shadow-sm flex items-center gap-1">
            <Car className="h-3.5 w-3.5" /> Post Ride
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-6">
        
        {/* Earnings Vault Link */}
        <Link href="/driver/earnings" className="bg-white border border-gray-200 p-3.5 rounded-2xl shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Earnings Vault</p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">View Payout History</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </Link>

        {/* --- PENDING REQUESTS --- */}
        {pendingRequests.length > 0 && (
          <section className="space-y-3 animate-in fade-in">
            <h2 className="text-xs font-bold text-orange-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> New Requests
            </h2>
            
            {pendingRequests.map((req) => {
              const passenger = passengerProfiles[req.passenger_id] || { first_name: 'Unknown', last_name: 'User' };

              return (
                <div key={req.id} className="bg-white rounded-2xl border-2 border-orange-100 p-4 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-700 font-bold border border-orange-100">
                        {passenger.first_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{passenger.first_name} {passenger.last_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">To: {req.rides?.destination_hub}</p>
                      </div>
                    </div>
                    <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Users className="h-3 w-3" /> {req.seats_needed}
                    </div>
                  </div>

                  {/* Professional Route Box */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pickup Point</p>
                     <p className="font-bold text-gray-900 text-sm truncate">{req.pickup_postcode}</p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAccept(req)}
                      disabled={!!processingId}
                      className="flex-[2] bg-emerald-600 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                    >
                      {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Accept
                    </button>
                    <button 
                      onClick={() => handleDecline(req.id)}
                      disabled={!!processingId}
                      className="flex-1 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* --- ACTIVE ROUTES --- */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">My Active Routes</h2>
          
          {myRides.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <Car className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-500 text-sm">No active shifts scheduled.</p>
            </div>
          ) : (
            myRides.map((ride) => {
              const confirmedMatches = ride.trip_matches?.filter((m: any) => m.match_status === 'confirmed') || [];

              return (
                <div key={ride.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
                  {/* Status Header */}
                  <div className={`px-4 py-3 flex justify-between items-center border-b border-gray-100 ${ride.status === 'full' ? 'bg-orange-50/50' : 'bg-emerald-50/50'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${ride.status === 'full' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {ride.status === 'full' ? 'Full Capacity' : `${ride.remaining_seats} Seats Left`}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{formatShortDate(ride.ride_date)}</span>
                  </div>

                  <div className="p-4 space-y-5">
                    {/* Destination & Time Box */}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Destination</p>
                        <p className="text-lg font-bold text-gray-900 leading-tight">{ride.destination_hub}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Shift</p>
                        <p className="text-sm font-bold text-emerald-600">{ride.departure_time}</p>
                      </div>
                    </div>

                    {/* Passenger Manifest Box */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <Users className="h-3 w-3" /> Passenger Manifest
                      </h4>
                      
                      {confirmedMatches.length === 0 ? (
                        <p className="text-xs font-medium text-gray-400 italic text-center py-2">Waiting for passengers...</p>
                      ) : (
                        <div className="space-y-2">
                          {confirmedMatches.map((match: any, idx: number) => {
                            const passenger = passengerProfiles[match.passenger_id] || {};
                            const phone = passenger.mobile_number?.replace('+', '') || "";
                            const waLink = `https://wa.me/${phone}?text=Hi! I am your driver for the ${ride.departure_time} shift to ${ride.destination_hub}.`;

                            return (
                              <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2.5 truncate pr-2">
                                  <div className="h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div className="truncate">
                                    <p className="font-bold text-gray-900 text-xs truncate">{passenger.first_name} {passenger.last_name}</p>
                                    <p className="text-[10px] font-semibold text-gray-500 truncate flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-2.5 w-2.5" /> {match.pickup_postcode.split(' ')[0]}
                                    </p>
                                  </div>
                                </div>
                                {phone && (
                                  <a href={waLink} target="_blank" rel="noreferrer" className="h-8 w-8 bg-gray-900 text-white rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0">
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => triggerCancelWarning(ride.id)}
                      disabled={processingId === ride.id}
                      className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors disabled:opacity-50"
                    >
                      {processingId === ride.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Cancel Route
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* --- COMPACT CANCEL MODAL --- */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
             <div className="flex items-center gap-3 mb-3">
               <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 shrink-0">
                 <AlertTriangle className="h-5 w-5" />
               </div>
               <h3 className="text-lg font-bold text-gray-900">Cancel this route?</h3>
             </div>
             <p className="text-sm text-gray-500 mb-6 pl-13">This will permanently remove the route and automatically notify any assigned passengers.</p>
             
             <div className="flex gap-2">
               <button onClick={() => setCancelModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                 Keep Route
               </button>
               <button onClick={confirmCancelTrip} disabled={!!processingId} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition flex justify-center items-center">
                 {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Route"}
               </button>
             </div>
          </div>
        </div>
      )}

      <DriverNav />
    </div>
  );
}