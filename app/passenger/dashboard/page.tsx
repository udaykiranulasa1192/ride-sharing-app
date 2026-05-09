"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Car, 
  MessageCircle, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle,
  Calendar,
  LayoutDashboard,
  ArrowRight
} from "lucide-react";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import PassengerAuthForm from "@/components/PassengerAuthForm";

export default function PassengerDashboard() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const [confirmedTrips, setConfirmedTrips] = useState<any[]>([]);
  const [pendingBroadcasts, setPendingBroadcasts] = useState<any[]>([]);
  const [pendingSeatRequests, setPendingSeatRequests] = useState<any[]>([]);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [matchToCancel, setMatchToCancel] = useState<any | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);

    // Get today's date in YYYY-MM-DD format to filter out past rides instantly
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch matches only for TODAY or FUTURE
    const { data: matchesData } = await supabase
      .from('trip_matches')
      .select(`*, rides!inner(*)`)
      .eq('passenger_id', user.id)
      .in('match_status', ['pending', 'confirmed'])
      .gte('rides.ride_date', today) // <-- AUTO-HIDE EXPIRED RIDES
      .order('created_at', { ascending: false });

    // 2. Fetch broadcasts only for TODAY or FUTURE
    const { data: broadcasts } = await supabase
      .from('open_requests')
      .select('*')
      .eq('passenger_id', user.id)
      .gte('ride_date', today) // <-- AUTO-HIDE EXPIRED BROADCASTS
      .order('ride_date', { ascending: true });

    const driverIds = new Set<string>();
    matchesData?.forEach((m: any) => { if (m.rides?.driver_id) driverIds.add(m.rides.driver_id); });

    const driverPhones: Record<string, string> = {};
    if (driverIds.size > 0) {
      const { data: profiles } = await supabase
        .from('driver_profiles')
        .select('id, mobile_number')
        .in('id', Array.from(driverIds));
      profiles?.forEach(p => { driverPhones[p.id] = p.mobile_number; });
    }

    const enrichedMatches = matchesData?.map((m: any) => ({
      ...m,
      driver_phone: driverPhones[m.rides?.driver_id] || ""
    })) || [];

    setConfirmedTrips(enrichedMatches.filter(m => m.match_status === 'confirmed'));
    setPendingSeatRequests(enrichedMatches.filter(m => m.match_status === 'pending'));
    setPendingBroadcasts(broadcasts || []);
    setLoading(false);
  }

  const handleCancelBroadcast = async (id: string) => {
    setCancelingId(id);
    await supabase.from('open_requests').delete().eq('id', id);
    await fetchDashboardData();
    setCancelingId(null);
  };

  const handleCancelSeatRequest = async (id: string) => {
    setCancelingId(id);
    await supabase.from('trip_matches').delete().eq('id', id);
    await fetchDashboardData();
    setCancelingId(null);
  };

  const triggerCancelWarning = (match: any) => {
    setMatchToCancel(match);
    setCancelModalOpen(true);
  };

  const confirmCancelRequest = async () => {
    if (!matchToCancel) return;
    setCancelingId(matchToCancel.id);
    
    const { data: rideData } = await supabase.from('rides').select('remaining_seats').eq('id', matchToCancel.ride_id).single();
    if (rideData) {
      const refundedSeats = rideData.remaining_seats + matchToCancel.seats_needed;
      await supabase.from('rides').update({ remaining_seats: refundedSeats }).eq('id', matchToCancel.ride_id);
    }

    await supabase.from('trip_matches').update({ match_status: 'cancelled' }).eq('id', matchToCancel.id);
    await fetchDashboardData();
    setCancelingId(null);
    setCancelModalOpen(false);
    setMatchToCancel(null);
  };

  // --- BULLETPROOF DATE FORMATTER ---
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Split "YYYY-MM-DD" safely to avoid timezone jumping
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr; // fallback if somehow malformed
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-50 p-4 pb-32">
      <div className="max-w-md mx-auto pt-16 text-center">
        <div className="h-16 w-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <LayoutDashboard className="h-8 w-8 text-gray-900" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
        <p className="text-gray-500 text-sm mb-10">Sign in to manage your upcoming shifts and rides.</p>
        <PassengerAuthForm onSuccess={fetchDashboardData} />
      </div>
      <PassengerBottomNav />
    </div>
  );

  const hasPending = pendingBroadcasts.length > 0 || pendingSeatRequests.length > 0;
  const hasConfirmed = confirmedTrips.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-5 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">My Rides</h1>
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-6">

        {/* --- PENDING SECTION --- */}
        {hasPending && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-orange-500 uppercase tracking-wider px-1">Looking for Driver</h2>

            {/* Pending Broadcasts */}
            {pendingBroadcasts.map((req) => (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-100">BROADCASTING</span>
                  <p className="font-bold text-gray-900">£{Number(req.calculated_price).toFixed(2)}</p>
                </div>
                
                {/* Crisp Outline Box */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-3 mb-3">
                  <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold mb-1.5">
                    <span>Route</span>
                    <span>Date & Shift</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="truncate max-w-[80px]">{req.pickup_postcode.split(' ')[0]}</span> 
                      <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" /> 
                      <span className="truncate">{req.destination_hub}</span>
                    </div>
                    <span className="text-emerald-600 whitespace-nowrap">{formatShortDate(req.ride_date)} • {req.shift_type}</span>
                  </div>
                </div>

                <button onClick={() => handleCancelBroadcast(req.id)} disabled={cancelingId === req.id} className="w-full py-2 text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg transition-colors flex justify-center items-center">
                  {cancelingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel Broadcast"}
                </button>
              </div>
            ))}

            {/* Pending Seat Requests */}
            {pendingSeatRequests.map((match) => (
              <div key={match.id} className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">AWAITING DRIVER</span>
                     <span className="text-xs font-medium text-gray-600">{match.rides.driver_name}</span>
                   </div>
                   <p className="font-bold text-gray-900">£{Number(match.rides.price).toFixed(2)}</p>
                </div>

                {/* Crisp Outline Box */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-3 mb-3">
                  <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold mb-1.5">
                    <span>Route</span>
                    <span>Date & Shift</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="truncate max-w-[80px]">{match.pickup_postcode.split(' ')[0]}</span> 
                      <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" /> 
                      <span className="truncate">{match.rides.destination_hub}</span>
                    </div>
                    <span className="text-emerald-600 whitespace-nowrap">{formatShortDate(match.rides.ride_date)} • {match.rides.departure_time}</span>
                  </div>
                </div>

                <button onClick={() => handleCancelSeatRequest(match.id)} disabled={cancelingId === match.id} className="w-full py-2 text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg transition-colors flex justify-center items-center">
                  {cancelingId === match.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Withdraw Request"}
                </button>
              </div>
            ))}
          </section>
        )}

        {/* --- CONFIRMED SECTION --- */}
        {hasConfirmed && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Upcoming Rides</h2>

            {confirmedTrips.map((ride) => {
              const phoneStr = ride.driver_phone?.replace('+', '') || "";
              const waLink = `https://wa.me/${phoneStr}?text=Hi! I am confirmed for the ${ride.rides.departure_time} shift.`;

              return (
                <div key={ride.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3.5">
                  
                  {/* Top Bar */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {ride.rides.driver_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-bold text-gray-900 text-sm leading-none">{ride.rides.driver_name}</p>
                          <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{ride.rides.vehicle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900 leading-none">£{Number(ride.rides.price).toFixed(2)}</p>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Confirmed</span>
                    </div>
                  </div>
                  
                  {/* Crisp Outline Box */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3 mb-3">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold mb-1.5">
                      <span>Route</span>
                      <span>Date & Shift Time</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-900">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="truncate max-w-[80px]">{ride.pickup_postcode.split(' ')[0]}</span> 
                        <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" /> 
                        <span className="truncate">{ride.rides.destination_hub}</span>
                      </div>
                      <span className="text-emerald-600 whitespace-nowrap bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{formatShortDate(ride.rides.ride_date)} • {ride.rides.departure_time}</span>
                    </div>
                  </div>

                  {/* Compact Action Buttons */}
                  <div className="flex gap-2">
                    <a href={waLink} target="_blank" rel="noreferrer" className="flex-[2] bg-gray-900 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-gray-800 transition-colors shadow-sm">
                      <MessageCircle className="h-3.5 w-3.5" /> Message Driver
                    </a>
                    <button onClick={() => triggerCancelWarning(ride)} className="flex-1 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* --- EMPTY STATE --- */}
        {!hasPending && !hasConfirmed && (
          <div className="text-center py-16 px-4">
            <div className="h-14 w-14 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Car className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No upcoming rides</h3>
            <p className="text-gray-500 text-xs">When you book a seat, it will show up here.</p>
          </div>
        )}

      </main>

      {/* --- COMPACT CANCEL MODAL --- */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
             <div className="flex items-center gap-3 mb-3">
               <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 shrink-0">
                 <AlertTriangle className="h-5 w-5" />
               </div>
               <h3 className="text-lg font-bold text-gray-900">Cancel this ride?</h3>
             </div>
             <p className="text-sm text-gray-500 mb-6 pl-13">This will notify the driver and remove your request. This action cannot be undone.</p>
             
             <div className="flex gap-2">
               <button onClick={() => setCancelModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                 Keep it
               </button>
               <button onClick={confirmCancelRequest} disabled={!!cancelingId} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition flex justify-center items-center">
                 {cancelingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Ride"}
               </button>
             </div>
          </div>
        </div>
      )}

      <PassengerBottomNav />
    </div>
  );
}