"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Car, 
  Clock, 
  MapPin, 
  MessageCircle, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle,
  Calendar
} from "lucide-react";
import Link from "next/link";
import PassengerBottomNav from "@/components/PassengerBottomNav";

export default function PassengerDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- CUSTOM MODAL STATE ---
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [matchToCancel, setMatchToCancel] = useState<any | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // STEP 1: Fetch the matches and ride info (NO risky nested joins)
    const { data: matchesData, error } = await supabase
      .from('trip_matches')
      .select(`
        *,
        rides!inner(
          id, driver_id, ride_date, departure_time, destination_hub, vehicle, driver_name, remaining_seats
        )
      `)
      .eq('passenger_id', user.id)
      .in('match_status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Dashboard Fetch Error:", error);
      setLoading(false);
      return;
    }

    // STEP 2: The Bulletproof Phone Number Fetch
    const driverIds = new Set<string>();
    matchesData?.forEach((m: any) => {
      if (m.rides?.driver_id) driverIds.add(m.rides.driver_id);
    });

    const driverPhones: Record<string, string> = {};
    if (driverIds.size > 0) {
      const { data: profiles } = await supabase
        .from('driver_profiles')
        .select('id, mobile_number')
        .in('id', Array.from(driverIds));

      profiles?.forEach(p => {
        driverPhones[p.id] = p.mobile_number;
      });
    }

    // Combine the data so it's easy to render in the UI
    const enrichedMatches = matchesData?.map((m: any) => ({
      ...m,
      driver_phone: driverPhones[m.rides?.driver_id] || ""
    })) || [];

    setBookings(enrichedMatches);
    setLoading(false);
  }

  // --- CANCEL LOGIC ---
  const triggerCancelWarning = (match: any) => {
    setMatchToCancel(match);
    setCancelModalOpen(true);
  };

  const confirmCancelRequest = async () => {
    if (!matchToCancel) return;
    setProcessingId(matchToCancel.id);
    
    // If the ride was confirmed, give the driver their seat back!
    if (matchToCancel.match_status === 'confirmed') {
      const { data: rideData } = await supabase.from('rides').select('remaining_seats').eq('id', matchToCancel.ride_id).single();
      
      if (rideData) {
        const refundedSeats = rideData.remaining_seats + matchToCancel.seats_needed;
        await supabase.from('rides').update({ remaining_seats: refundedSeats }).eq('id', matchToCancel.ride_id);
      }
    }

    // Mark as cancelled
    await supabase.from('trip_matches').update({ match_status: 'cancelled' }).eq('id', matchToCancel.id);

    await fetchBookings();
    setProcessingId(null);
    setCancelModalOpen(false);
    setMatchToCancel(null);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );

  const confirmedRides = bookings.filter(b => b.match_status === 'confirmed');
  const pendingRequests = bookings.filter(b => b.match_status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 pb-32 relative">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 py-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg shadow-sm">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">My Bookings</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        
        {/* --- CONFIRMED RIDES --- */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">
            Confirmed Trips
          </h2>
          
          {confirmedRides.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center">
              <p className="text-sm font-bold text-gray-400">No confirmed rides yet.</p>
            </div>
          ) : (
            confirmedRides.map((ride) => {
              const phoneStr = ride.driver_phone?.replace('+', '') || "";
              const waLink = phoneStr 
                ? `https://wa.me/${phoneStr}?text=Hi! I am confirmed for the ${ride.rides.departure_time} ride to ${ride.rides.destination_hub}.` 
                : "#";

              return (
                <div key={ride.id} className="bg-white rounded-[32px] border-2 border-emerald-500 p-5 shadow-lg shadow-emerald-600/10 animate-in fade-in">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 font-black text-xl border border-emerald-100">
                        {ride.rides.driver_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg leading-none mb-1">{ride.rides.driver_name}</p>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                          <ShieldCheck className="h-3 w-3" /> Confirmed
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</p>
                      <p className="font-black text-gray-900 text-sm">{new Date(ride.rides.ride_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pickup</p>
                      <p className="font-black text-gray-900 uppercase tracking-tighter truncate">{ride.pickup_postcode}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Time</p>
                      <p className="font-black text-emerald-600 uppercase tracking-tighter">{ride.rides.departure_time}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {phoneStr ? (
                      <a 
                        href={waLink} 
                        target="_blank"
                        rel="noreferrer"
                        className="flex-[3] bg-[#25D366] text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-md shadow-green-500/20 active:scale-95 transition-all"
                      >
                        <MessageCircle className="h-5 w-5 fill-white" /> WhatsApp
                      </a>
                    ) : (
                      <button disabled className="flex-[3] bg-gray-100 text-gray-400 py-3 rounded-xl font-black text-sm">No Phone Provided</button>
                    )}

                    <button 
                      onClick={() => triggerCancelWarning(ride)}
                      className="flex-1 bg-red-50 text-red-500 py-3 rounded-xl font-black flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* --- PENDING REQUESTS --- */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
            Waiting for Driver
          </h2>
          
          {pendingRequests.length === 0 ? (
             <div className="p-4 text-center">
                <p className="text-xs font-bold text-gray-300">No active requests.</p>
             </div>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm opacity-80 animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                   <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-400 animate-pulse" />
                      <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Pending...</span>
                   </div>
                   <button 
                    onClick={() => triggerCancelWarning(req)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                   >
                     <XCircle className="h-5 w-5" />
                   </button>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destination</p>
                    <p className="font-black text-gray-900 text-lg">{req.rides.destination_hub}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Time</p>
                    <p className="font-black text-gray-900">{req.rides.departure_time}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* --- CANCEL CONFIRMATION MODAL --- */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            
            <h3 className="text-xl font-black text-center text-gray-900 mb-2 tracking-tight">
              {matchToCancel?.match_status === 'confirmed' ? "Cancel confirmed seat?" : "Cancel request?"}
            </h3>
            <p className="text-sm text-center text-gray-500 mb-6 leading-relaxed">
              {matchToCancel?.match_status === 'confirmed' 
                ? "This will cancel your booking and instantly return the seat to the driver." 
                : "This will remove your request from the driver's queue."}
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => { setCancelModalOpen(false); setMatchToCancel(null); }}
                className="flex-1 py-4 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Nevermind
              </button>
              <button 
                onClick={confirmCancelRequest}
                disabled={!!processingId}
                className="flex-1 py-4 font-black text-white bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
              >
                {processingId === matchToCancel?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PassengerBottomNav />
    </div>
  );
}