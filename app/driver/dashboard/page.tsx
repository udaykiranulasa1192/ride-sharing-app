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
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import DriverNav from "@/components/DriverNav";

export default function DriverDashboard() {
  const [myRides, setMyRides] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch the driver's active rides
    const { data: ridesData } = await supabase
      .from('rides')
      .select(`
        *,
        trip_matches (
          id,
          pickup_postcode,
          seats_needed,
          match_status,
          passenger_id
        )
      `)
      .eq('driver_id', user.id)
      .in('status', ['active', 'full'])
      .order('ride_date', { ascending: true });

    // 2. Fetch Pending Requests specifically to show at the top
    // Note: We join with passenger_profiles to get their names/phones for the handshake
    const { data: requestsData } = await supabase
      .from('trip_matches')
      .select(`
        *,
        rides!inner(driver_id, departure_time, destination_hub, ride_date),
        passenger_profiles:passenger_id(first_name, last_name, mobile_number)
      `)
      .eq('rides.driver_id', user.id)
      .eq('match_status', 'pending');

    if (ridesData) setMyRides(ridesData);
    if (requestsData) setPendingRequests(requestsData);
    setLoading(false);
  }

  const handleAccept = async (requestId: string, rideId: string) => {
    setProcessingId(requestId);
    // This calls the atomic SQL function we created to auto-decline other requests
    const { error } = await supabase.rpc('mvp_accept_ride_request', {
      p_request_id: requestId,
      p_ride_id: rideId
    });

    if (error) {
      alert("Acceptance failed: " + error.message);
    } else {
      await fetchDashboardData();
    }
    setProcessingId(null);
  };

  const handleDecline = async (requestId: string) => {
    const { error } = await supabase
      .from('trip_matches')
      .update({ match_status: 'declined' })
      .eq('id', requestId);
    
    if (!error) fetchDashboardData();
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
              <Car className="h-5 w-5 text-white" />
            </Link>
            <div className="flex flex-col">
              <span className="text-lg font-black text-gray-900 tracking-tight leading-none">ShiftPool</span>
              <h1 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Driver Console</h1>
            </div>
          </div>
          <Link href="/driver/post" className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20">
            Post Ride
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        
        {/* --- SECTION 1: INCOMING REQUESTS (THE MVP QUEUE) --- */}
        {pendingRequests.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-black text-emerald-600 uppercase tracking-widest px-1 flex items-center gap-2">
              <Clock className="h-3 w-3" /> New Ride Requests
            </h2>
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-3xl border-2 border-emerald-100 p-5 shadow-lg shadow-emerald-600/5 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 font-black text-lg border border-emerald-100">
                      {req.passenger_profiles?.first_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-lg leading-none">
                        {req.passenger_profiles?.first_name} {req.passenger_profiles?.last_name}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">
                        Going to {req.rides.destination_hub}
                      </p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-black text-emerald-700 text-sm">{req.seats_needed}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-5">
                   <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pickup Postcode</p>
                        <p className="font-black text-gray-900 text-lg tracking-widest uppercase">{req.pickup_postcode}</p>
                      </div>
                   </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAccept(req.id, req.ride_id)}
                    disabled={!!processingId}
                    className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    {processingId === req.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    Accept Passenger
                  </button>
                  <button 
                    onClick={() => handleDecline(req.id)}
                    disabled={!!processingId}
                    className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-4 rounded-xl font-black text-sm hover:text-red-500 hover:border-red-100 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* --- SECTION 2: MY ACTIVE ROUTES & MANIFESTS --- */}
        <section className="space-y-4">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">My Active Routes</h2>
          {myRides.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center">
              <Car className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="font-bold text-gray-400">No active shifts scheduled.</p>
            </div>
          ) : (
            myRides.map((ride) => {
              const confirmedMatches = ride.trip_matches?.filter((m: any) => m.match_status === 'confirmed') || [];

              return (
                <div key={ride.id} className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden mb-6">
                  <div className={`px-6 py-4 flex justify-between items-center ${ride.status === 'full' ? 'bg-orange-50' : 'bg-emerald-50'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${ride.status === 'full' ? 'text-orange-700' : 'text-emerald-700'}`}>
                      {ride.status === 'full' ? 'Full Capacity' : `${ride.remaining_seats} Seats Available`}
                    </span>
                    <span className="text-sm font-black text-gray-900">{new Date(ride.ride_date).toLocaleDateString()}</span>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destination</p>
                        <p className="text-2xl font-black text-gray-900">{ride.destination_hub}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Start Time</p>
                        <p className="text-2xl font-black text-emerald-600">{ride.departure_time}</p>
                      </div>
                    </div>

                    {/* CONFIRMED PASSENGERS (WITH WHATSAPP HANDSHAKE) */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Users className="h-3 w-3" /> Confirmed Passengers
                      </h4>
                      
                      {confirmedMatches.length === 0 ? (
                        <p className="text-sm font-bold text-gray-300 italic py-2">Waiting for passengers to join...</p>
                      ) : (
                        <div className="space-y-2">
                          {confirmedMatches.map((match: any, idx: number) => {
                            // Fetch passenger profile from metadata or profile table
                            // For MVP, we assume match.passenger_profiles is populated via a join in a real fetch
                            const phone = match.passenger_profiles?.mobile_number?.replace('+', '') || "";
                            const waLink = `https://wa.me/${phone}?text=Hi! I am your ShiftPool driver for the ${ride.departure_time} shift to ${ride.destination_hub}.`;

                            return (
                              <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-900 uppercase text-sm tracking-widest">{match.pickup_postcode}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{match.seats_needed} Seat(s)</p>
                                  </div>
                                </div>
                                <a 
                                  href={waLink} 
                                  target="_blank" 
                                  className="h-10 w-10 bg-[#25D366] text-white rounded-xl flex items-center justify-center shadow-md hover:scale-110 transition-transform active:scale-95"
                                >
                                  <MessageCircle className="h-5 w-5" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => {/* Your Cancel Logic */}}
                      className="w-full py-4 rounded-2xl border-2 border-red-50 text-red-600 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 transition-colors mt-2"
                    >
                      <XCircle className="h-4 w-4" /> Cancel Trip
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
      <DriverNav/>
    </div>
  );
}