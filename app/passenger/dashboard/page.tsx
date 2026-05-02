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
  AlertCircle,
  Calendar
} from "lucide-react";
import Link from "next/link";

export default function PassengerDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch matches joined with ride and driver details
    const { data, error } = await supabase
      .from('trip_matches')
      .select(`
        *,
        rides!inner(ride_date, departure_time, destination_hub, vehicle, driver_name),
        driver_profiles:rides(driver_id) 
      `)
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false });

    // Note: To get the driver's phone for WhatsApp, we'd ideally join driver_profiles
    // via the rides table. Assuming your schema allows this join:
    if (!error && data) setBookings(data);
    setLoading(false);
  }

  const handleCancelRequest = async (matchId: string) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;
    
    setCancellingId(matchId);
    const { error } = await supabase
      .from('trip_matches')
      .delete()
      .eq('id', matchId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      fetchBookings();
    }
    setCancellingId(null);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );

  const confirmedRides = bookings.filter(b => b.match_status === 'confirmed');
  const pendingRequests = bookings.filter(b => b.match_status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 py-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">My Bookings</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        
        {/* SECTION 1: CONFIRMED RIDES (READY TO GO) */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">
            Confirmed Trips
          </h2>
          
          {confirmedRides.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center">
              <p className="text-sm font-bold text-gray-400">No confirmed rides yet.</p>
            </div>
          ) : (
            confirmedRides.map((ride) => (
              <div key={ride.id} className="bg-white rounded-[32px] border-2 border-emerald-500 p-5 shadow-lg shadow-emerald-600/10 animate-in fade-in">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 font-black border border-emerald-100">
                      {ride.rides.driver_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 leading-none mb-1">{ride.rides.driver_name}</p>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                        <ShieldCheck className="h-3 w-3" /> Booking Confirmed
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</p>
                    <p className="font-black text-gray-900 text-sm">{new Date(ride.rides.ride_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pickup</p>
                    <p className="font-black text-gray-900 uppercase tracking-tighter">{ride.pickup_postcode}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Time</p>
                    <p className="font-black text-emerald-600 uppercase tracking-tighter">{ride.rides.departure_time}</p>
                  </div>
                </div>

                {/* THE WHATSAPP HANDSHAKE */}
                <Link 
                  href={`https://wa.me/447000000000?text=Hi! I am confirmed for the ${ride.rides.departure_time} ride to ${ride.rides.destination_hub}.`} 
                  target="_blank"
                  className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <MessageCircle className="h-5 w-5 fill-white" />
                  WhatsApp Driver
                </Link>
              </div>
            ))
          )}
        </section>

        {/* SECTION 2: PENDING REQUESTS */}
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
              <div key={req.id} className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm opacity-80">
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-400 animate-pulse" />
                      <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Pending...</span>
                   </div>
                   <button 
                    onClick={() => handleCancelRequest(req.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                   >
                     <XCircle className="h-5 w-5" />
                   </button>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destination</p>
                    <p className="font-black text-gray-900">{req.rides.destination_hub}</p>
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
    </div>
  );
}