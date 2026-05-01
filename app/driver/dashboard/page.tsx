"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Navigation, Calendar, Users, Phone, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DriverDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    // 1. Get logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/driver/login");
      return;
    }

    // 2. Fetch rides posted by this driver
    const { data: ridesData } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });

    if (ridesData && ridesData.length > 0) {
      setMyRides(ridesData);

      // 3. Fetch all requests for these rides
      const rideIds = ridesData.map(r => r.id);
      const { data: requestsData } = await supabase
        .from('ride_requests')
        .select('*')
        .in('ride_id', rideIds)
        .order('created_at', { ascending: false });

      if (requestsData) {
        setRequests(requestsData);
      }
    }
    setLoading(false);
  }

  const updateRequestStatus = async (requestId: string, newStatus: 'accepted' | 'declined') => {
    // Optimistic UI update for instant feedback
    setRequests(requests.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    ));

    // Update database
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    if (error) {
      alert("Failed to update status. Please try again.");
      fetchDashboardData(); // Revert on failure
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {myRides.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center mt-10">
            <Car className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">You haven't posted any rides yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {myRides.map(ride => {
              // Filter requests that belong to this specific ride
              const rideRequests = requests.filter(req => req.ride_id === ride.id);

              return (
                <div key={ride.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Ride Header */}
                  <div className="bg-emerald-600 p-4 text-white">
                    <h2 className="text-lg font-black uppercase tracking-tight mb-1">
                      {ride.outward_code} to {ride.destination_hub}
                    </h2>
                    <div className="flex items-center gap-4 text-emerald-100 text-sm font-medium">
                      <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {ride.shift_type} ({ride.departure_time})</div>
                      <div className="flex items-center gap-1"><Users className="h-4 w-4" /> {ride.seats_available} seats</div>
                    </div>
                  </div>

                  {/* Passenger Requests Section */}
                  <div className="p-4 bg-gray-50">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                      Passenger Requests
                    </h3>

                    {rideRequests.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-2">No requests yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {rideRequests.map(req => (
                          <div key={req.id} className={`p-3 rounded-xl border ${req.status === 'accepted' ? 'bg-emerald-50 border-emerald-200' : req.status === 'declined' ? 'bg-red-50 border-red-100 opacity-50' : 'bg-white border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold text-gray-900">{req.passenger_name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" /> {req.passenger_postcode}
                                </p>
                              </div>
                              
                              {/* Status Badges */}
                              {req.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded uppercase">Pending</span>}
                              {req.status === 'accepted' && <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded uppercase">Accepted</span>}
                              {req.status === 'declined' && <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 rounded uppercase">Declined</span>}
                            </div>

                            {/* Action Buttons (Only show if pending) */}
                            {req.status === 'pending' && (
                              <div className="flex gap-2 mt-3">
                                <button onClick={() => updateRequestStatus(req.id, 'accepted')} className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 active:scale-95 transition-all">
                                  <CheckCircle className="h-4 w-4" /> Accept
                                </button>
                                <button onClick={() => updateRequestStatus(req.id, 'declined')} className="flex-1 flex items-center justify-center gap-1 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-bold hover:bg-red-200 active:scale-95 transition-all">
                                  <XCircle className="h-4 w-4" /> Decline
                                </button>
                              </div>
                            )}

                            {/* WhatsApp Button (Only show if accepted) */}
                            {req.status === 'accepted' && (
                              <a 
                                href={`https://wa.me/${req.passenger_phone.replace(/\D/g, '')}?text=Hi%20${req.passenger_name},%20I've%20accepted%20your%20ride%20request%20on%20ShiftPool!`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="mt-2 flex items-center justify-center gap-2 w-full bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
                              >
                                <Phone className="h-4 w-4" /> Message {req.passenger_name}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}