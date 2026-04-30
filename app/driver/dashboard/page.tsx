"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Users, MapPin, Phone, Loader2, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DriverDashboard() {
  const router = useRouter();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // Here is our user state!

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  async function checkUserAndFetchData() {
    // 1. Get the currently logged-in user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      router.push("/driver/login");
      return;
    }

    setUser(authUser); // Save the user to state
    
    // Fetch the data using the secure ID
    fetchDashboardData(authUser.id);
  }

  // Helper function with the SECURE LOCK applied (.eq('driver_id', userId))
  async function fetchDashboardData(userId: string) {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        ride_requests (*)
      `)
      .eq('driver_id', userId) // <-- THE LOCK: Only fetches YOUR rides
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching dashboard:", error);
    } else {
      setRides(data || []);
    }
    setLoading(false);
  }

  const handleAction = async (requestId: string, newStatus: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    // If it succeeds and we have a user, refresh the secure dashboard
    if (!error && user) {
      fetchDashboardData(user.id);
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
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Driver Dashboard</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        {rides.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center mt-4">
            <div className="bg-gray-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-bold mb-1">No active rides</h3>
            <p className="text-gray-500 text-sm mb-6">You haven't posted any routes under this account yet.</p>
            <button 
              onClick={() => router.push('/driver')}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm w-full hover:bg-emerald-700 transition-colors"
            >
              Post Your First Ride
            </button>
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {rides.map((ride) => (
              <div key={ride.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-emerald-600 p-4 text-white relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest opacity-80">Route</span>
                    <span className="text-[10px] bg-white text-emerald-700 px-2 py-1 rounded font-black uppercase shadow-sm">
                      {ride.shift_type}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold mt-1">To {ride.destination_hub.replace('_', ' ').toUpperCase()}</h2>
                  <div className="flex items-center gap-4 text-sm mt-3 opacity-90 font-medium">
                    <div className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {ride.outward_code}</div>
                    <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {ride.departure_time}</div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Requests ({ride.ride_requests?.length || 0})
                  </h3>
                  
                  {(!ride.ride_requests || ride.ride_requests.length === 0) ? (
                    <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                      Waiting for passengers...
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {ride.ride_requests.map((req: any) => (
                        <div key={req.id} className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="font-bold text-gray-900 block">{req.passenger_name}</span>
                              <span className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" /> Pickup: {req.passenger_postcode}
                              </span>
                            </div>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              req.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>{req.status}</span>
                          </div>

                          {req.status === 'pending' && (
                            <div className="flex gap-2 mt-2">
                              <button 
                                onClick={() => handleAction(req.id, 'accepted')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold transition-colors"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => handleAction(req.id, 'rejected')}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-bold transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          )}

                          {req.status === 'accepted' && (
                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 mt-2">
                              <Phone className="h-4 w-4" /> {req.passenger_phone}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}