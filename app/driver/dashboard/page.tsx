"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Navigation, Clock, Users, Loader2, Car, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function DriverDashboard() {
  const [myRides, setMyRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyRides();
  }, []);

  async function fetchMyRides() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch the driver's rides AND the nested passenger data
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        trip_matches (
          pickup_order,
          match_status,
          passenger_requests (
            pickup_postcode,
            seats_needed
          )
        )
      `)
      .eq('driver_id', user.id)
      .in('status', ['active', 'full'])
      .order('ride_date', { ascending: true });

    if (data) setMyRides(data);
    setLoading(false);
  }

  // --- YOUR CANCEL FUNCTION (Integrated with React State) ---
  const handleDriverCancel = async (rideId: string) => {
    const confirmCancel = window.confirm("Are you sure? This will cancel the trip and notify all passengers.");
    if (!confirmCancel) return;

    setCancellingId(rideId);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase.rpc('driver_cancel_ride', {
      p_ride_id: rideId,
      p_driver_id: user.id
    });

    if (error) {
      alert("Could not cancel ride: " + error.message);
      setCancellingId(null);
    } else {
      // Refresh the screen to remove the cancelled ride
      fetchMyRides(); 
      setCancellingId(null);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm hover:opacity-80 transition-opacity">
                <Car className="h-5 w-5 text-white" />
            </Link>
            <div className="flex flex-col justify-center">
              <span className="text-lg font-black text-gray-900 tracking-tight leading-none">My Routes</span>
              <h1 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Driver View</h1>
            </div>
          </div>
          <Link href="/driver/jobs" className="text-xs font-bold bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800">
            Find Jobs
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {myRides.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-500">You have no active routes.</p>
            <Link href="/driver" className="mt-4 inline-block text-emerald-600 font-bold text-sm hover:underline">
              Post a new shift
            </Link>
          </div>
        ) : (
          myRides.map((ride) => {
            // Filter out cancelled matches just in case
            const activeMatches = ride.trip_matches?.filter((m: any) => m.match_status === 'confirmed') || [];
            const totalPassengers = activeMatches.reduce((sum: number, match: any) => sum + match.passenger_requests.seats_needed, 0);

            return (
              <div key={ride.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Status Bar */}
                <div className={`px-5 py-3 flex justify-between items-center ${ride.status === 'full' ? 'bg-orange-50 border-b border-orange-100' : 'bg-emerald-50 border-b border-emerald-100'}`}>
                   <span className={`text-[10px] font-black uppercase tracking-widest ${ride.status === 'full' ? 'text-orange-700' : 'text-emerald-700'}`}>
                     {ride.status === 'full' ? 'Vehicle Full' : `${ride.remaining_seats} Seats Remaining`}
                   </span>
                   <span className="text-sm font-black text-gray-900">{new Date(ride.ride_date).toLocaleDateString()}</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Route Overview */}
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Destination</p>
                      <p className="text-xl font-black text-gray-900">{ride.destination_hub || "Workplace"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Departure</p>
                      <p className="text-xl font-black text-emerald-600">{ride.departure_time}</p>
                    </div>
                  </div>

                  {/* Passenger Manifest */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Users className="h-3 w-3" /> Passenger Manifest ({totalPassengers} Total)
                    </h4>
                    
                    {activeMatches.length === 0 ? (
                      <p className="text-xs font-medium text-gray-400 italic">No passengers booked yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {activeMatches.map((match: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">
                              {match.pickup_order || idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-sm text-gray-900">{match.passenger_requests.pickup_postcode}</p>
                              <p className="text-[10px] text-gray-500 font-medium">{match.passenger_requests.seats_needed} Seat(s)</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2">
                    <button 
                      onClick={() => handleDriverCancel(ride.id)}
                      disabled={cancellingId === ride.id}
                      className="w-full py-3 rounded-xl border-2 border-red-100 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {cancellingId === ride.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertCircle className="h-5 w-5" />}
                      {cancellingId === ride.id ? "Processing Cancellation..." : "Cancel Trip"}
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}