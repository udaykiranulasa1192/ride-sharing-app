"use client";

import { useEffect, useState } from "react";
import { 
  Car, MapPin, Clock, CheckCircle, XCircle, Loader2, Trash2, RadioTower, Calendar 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import PassengerAuthForm from "@/components/PassengerAuthForm"; 

export default function PassengerDashboard() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Two separate states for the two types of requests
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myBroadcasts, setMyBroadcasts] = useState<any[]>([]);

const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }
    
    setIsLoggedIn(true);
    // 1. Fetch the Profile
    const { data: profileData } = await supabase
      .from('passenger_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileData) {
      setProfile(profileData);

      // 2. Fetch Direct Requests (Specific rides they booked)
      // We join with the 'rides' table so we can show the destination and time!
      const { data: requestsData } = await supabase
        .from('ride_requests')
        .select('*, rides(*)') 
        .eq('passenger_phone', profileData.mobile_number)
        .order('created_at', { ascending: false });
      
      if (requestsData) setMyRequests(requestsData);

      // 3. Fetch Broadcasts (The custom alerts they sent to drivers)
      const { data: broadcastsData } = await supabase
        .from('open_requests')
        .select('*')
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (broadcastsData) setMyBroadcasts(broadcastsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- CANCEL LOGIC ---

  const handleCancelRide = async (requestId: string, status: string) => {
    const confirmCancel = window.confirm(
      status === 'accepted' ? "This ride is confirmed. Are you sure you want to cancel? Please message the driver." : "Cancel this request?"
    );
    if (confirmCancel) {
      const { error } = await supabase.from('ride_requests').delete().eq('id', requestId);
      if (!error) setMyRequests(current => current.filter(req => req.id !== requestId));
    }
  };

  const handleCancelBroadcast = async (broadcastId: string) => {
    const confirmCancel = window.confirm("Are you sure you want to remove this broadcast from the Open Rides board?");
    if (confirmCancel) {
      const { error } = await supabase.from('open_requests').delete().eq('id', broadcastId);
      if (!error) setMyBroadcasts(current => current.filter(b => b.id !== broadcastId));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-4 shadow-sm">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight text-center">My Bookings</h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {!isLoggedIn ? (
          <div className="mt-4">
             <PassengerAuthForm onSuccess={fetchDashboardData} />
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-md">
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1">Passenger Profile</p>
              <h2 className="text-2xl font-black">{profile?.first_name} {profile?.last_name}</h2>
            </div>
            
            {/* 0 Requests State */}
            {myRequests.length === 0 && myBroadcasts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                <Car className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium mb-4">No active requests or broadcasts.</p>
                <Link href="/search" className="text-emerald-600 font-bold hover:underline">Find a ride now</Link>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* --- SECTION 1: BROADCASTS --- */}
                {myBroadcasts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">My Broadcasts</h3>
                    {myBroadcasts.map((broadcast) => (
                      <div key={broadcast.id} className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden ring-1 ring-blue-50">
                        <div className="px-4 py-2 text-[10px] font-black uppercase flex items-center justify-between bg-blue-50 text-blue-800 border-b border-blue-100">
                          <div className="flex items-center gap-1.5">
                            <RadioTower className="h-3 w-3 animate-pulse"/>
                            Looking for Driver
                          </div>
                          <button onClick={() => handleCancelBroadcast(broadcast.id)} className="text-blue-400 hover:text-red-500 transition-colors p-1" title="Cancel Broadcast">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900 uppercase">{broadcast.outward_code} → {broadcast.destination_hub}</h4>
                          <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" /> Shift: <span className="font-bold uppercase text-gray-900">{broadcast.shift_type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* --- SECTION 2: BOOKINGS --- */}
                {myRequests.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">My Bookings</h3>
                    {myRequests.map((req) => (
                      <div key={req.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className={`px-4 py-2 text-[10px] font-black uppercase flex items-center justify-between ${
                          req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            {req.status === 'accepted' && <CheckCircle className="h-3 w-3"/>}
                            {req.status === 'pending' && <Clock className="h-3 w-3"/>}
                            {req.status}
                          </div>
                          <button onClick={() => handleCancelRide(req.id, req.status)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Cancel Booking">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900 uppercase">{req.rides?.outward_code} → {req.rides?.destination_hub}</h4>
                          <p className="mt-2 text-sm text-gray-600">Driver: <span className="font-bold">{req.rides?.driver_name}</span><br/>Leaves: <span className="font-bold">{req.rides?.departure_time}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}
          </>
        )}
      </main>
      <PassengerBottomNav /> 
    </div>
  );
}