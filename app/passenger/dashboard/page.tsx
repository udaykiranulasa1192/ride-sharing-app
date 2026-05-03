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
  Calendar,
  LayoutDashboard
} from "lucide-react";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import PassengerAuthForm from "@/components/PassengerAuthForm"; //

export default function PassengerDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // NEW: Track auth state
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- MODAL STATE ---
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [matchToCancel, setMatchToCancel] = useState<any | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // THE GATEKEEPER
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);

    // Fetch matches and ride info
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

    // Fetch Phone Numbers
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

    setBookings(enrichedMatches);
    setLoading(false);
  }

  // --- CANCEL LOGIC (Your existing code) ---
  const triggerCancelWarning = (match: any) => {
    setMatchToCancel(match);
    setCancelModalOpen(true);
  };

  const confirmCancelRequest = async () => {
    if (!matchToCancel) return;
    setProcessingId(matchToCancel.id);
    
    if (matchToCancel.match_status === 'confirmed') {
      const { data: rideData } = await supabase.from('rides').select('remaining_seats').eq('id', matchToCancel.ride_id).single();
      if (rideData) {
        const refundedSeats = rideData.remaining_seats + matchToCancel.seats_needed;
        await supabase.from('rides').update({ remaining_seats: refundedSeats }).eq('id', matchToCancel.ride_id);
      }
    }

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

  // --- 1. THE LOGIN WALL[cite: 2] ---
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-50 p-4 pb-32">
      <div className="max-w-md mx-auto pt-16 text-center">
        <div className="h-20 w-20 bg-emerald-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-600/20">
            <LayoutDashboard className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Passenger Hub</h2>
        <p className="text-gray-500 font-bold text-sm mb-12">Login to manage your rides and chat with drivers.</p>
        
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
           {/* Passing fetchBookings to onSuccess triggers the data load immediately after login[cite: 2] */}
           <PassengerAuthForm onSuccess={fetchBookings} />
        </div>
      </div>
      <PassengerBottomNav />
    </div>
  );

  // --- 2. THE LOGGED-IN DASHBOARD ---
  const confirmedRides = bookings.filter(b => b.match_status === 'confirmed');
  const pendingRequests = bookings.filter(b => b.match_status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 pb-32 relative">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 px-6 py-6 shadow-sm">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-xl shadow-md shadow-emerald-600/10">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase">My Bookings</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 space-y-10">
        
        {/* CONFIRMED RIDES SECTION */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] px-1">Confirmed Trips</h2>
          {confirmedRides.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-[32px] p-10 text-center">
              <p className="text-sm font-bold text-gray-300">No bookings yet.</p>
            </div>
          ) : (
            confirmedRides.map((ride) => {
              const phoneStr = ride.driver_phone?.replace('+', '') || "";
              const waLink = `https://wa.me/${phoneStr}?text=Hi! I am confirmed for the ${ride.rides.departure_time} ride.`;

              return (
                <div key={ride.id} className="bg-white rounded-[32px] border-2 border-emerald-500 p-6 shadow-xl shadow-emerald-600/5">
                  {/* ... (Your existing Ride Card UI) ... */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 font-black border border-emerald-100">
                        {ride.rides.driver_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg leading-none mb-1">{ride.rides.driver_name}</p>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                          <ShieldCheck className="h-3 w-3" /> Confirmed
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pickup</p>
                      <p className="font-black text-gray-900 uppercase truncate text-sm">{ride.pickup_postcode}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Time</p>
                      <p className="font-black text-emerald-600 text-sm">{ride.rides.departure_time}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a href={waLink} target="_blank" rel="noreferrer" className="flex-[3] bg-[#25D366] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all">
                      <MessageCircle className="h-5 w-5 fill-white" /> WhatsApp
                    </a>
                    <button onClick={() => triggerCancelWarning(ride)} className="flex-1 bg-red-50 text-red-500 py-4 rounded-2xl font-black flex items-center justify-center hover:bg-red-100 transition-colors">
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* PENDING SECTION */}
        {/* ... (Apply same card styling to Pending section) ... */}
      </main>

      {/* CANCEL MODAL (Your existing modal code) */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95">
             {/* ... Modal content ... */}
             <div className="mx-auto h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100 text-red-500">
               <AlertTriangle className="h-10 w-10" />
             </div>
             <h3 className="text-2xl font-black text-center text-gray-900 mb-2">Cancel request?</h3>
             <p className="text-sm text-center text-gray-400 mb-8 font-medium">This will remove your request from the driver's dashboard.</p>
             <div className="flex gap-3">
               <button onClick={() => setCancelModalOpen(false)} className="flex-1 py-4 font-black text-gray-400 bg-gray-100 rounded-2xl">Back</button>
               <button onClick={confirmCancelRequest} className="flex-1 py-4 font-black text-white bg-red-500 rounded-2xl shadow-lg shadow-red-500/20">
                 {processingId ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm"}
               </button>
             </div>
          </div>
        </div>
      )}

      <PassengerBottomNav />
    </div>
  );
}