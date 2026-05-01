"use client";

import { useEffect, useState } from "react";
import { 
  Car, MapPin, Clock, CheckCircle, XCircle, 
  Loader2, Lock, ArrowRight, Trash2 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link"; // FIXED: Must be next/link
import PassengerBottomNav from "@/components/PassengerBottomNav";

export default function PassengerDashboard() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }
        
        setIsLoggedIn(true);

        const { data: profileData } = await supabase
          .from('passenger_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          const { data: requestsData } = await supabase
            .from('ride_requests')
            .select('*, rides(driver_name, vehicle, departure_time, outward_code, destination_hub)')
            .eq('passenger_phone', profileData.mobile_number)
            .order('created_at', { ascending: false });

          if (requestsData) setMyRequests(requestsData);
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const handleCancelRide = async (requestId: string, status: string) => {
    const confirmCancel = window.confirm(
      status === 'accepted' 
      ? "This ride is already confirmed. Are you sure you want to cancel? Please also message the driver."
      : "Are you sure you want to cancel this pending request?"
    );

    if (confirmCancel) {
      const { error } = await supabase.from('ride_requests').delete().eq('id', requestId);
      if (!error) {
        setMyRequests(current => current.filter(req => req.id !== requestId));
      } else {
        alert("Could not cancel the ride. Please try again.");
      }
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
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-4 shadow-sm">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight text-center">My Bookings</h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {!isLoggedIn ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center shadow-sm mt-8">
            <Lock className="h-8 w-8 text-emerald-600 mx-auto mb-5" />
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Track Your Rides</h2>
            <p className="text-gray-500 text-sm mb-8">Log in to see your upcoming shifts and driver approvals.</p>
            <Link href="/passenger/signup" className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-white font-bold transition-all active:scale-95 shadow-sm">
              Log In / Sign Up <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-md">
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1">Passenger Profile</p>
              <h2 className="text-2xl font-black">{profile?.first_name} {profile?.last_name}</h2>
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-50 bg-emerald-700/30 p-2 rounded-xl w-fit">
                <MapPin className="h-4 w-4" />
                <span>Pickup: {profile?.postcode}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Current Bookings</h3>
              
              {myRequests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                  <Car className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-medium mb-4">No active requests.</p>
                  <Link href="/search" className="text-emerald-600 font-bold hover:underline">Find a ride now</Link>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    
                    <div className={`px-4 py-2 text-[10px] font-black uppercase flex items-center justify-between ${
                      req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 
                      req.status === 'declined' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {req.status === 'accepted' && <CheckCircle className="h-3 w-3"/>}
                        {req.status === 'pending' && <Clock className="h-3 w-3"/>}
                        {req.status === 'declined' && <XCircle className="h-3 w-3"/>}
                        {req.status}
                      </div>
                      
                      {/* Allow cancellation if not declined */}
                      {req.status !== 'declined' && (
                        <button 
                          onClick={() => handleCancelRide(req.id, req.status)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Cancel Ride"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="p-4">
                      <h4 className="font-bold text-gray-900 uppercase">{req.rides?.outward_code} → {req.rides?.destination_hub}</h4>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p>Driver: <span className="font-bold text-gray-900">{req.rides?.driver_name}</span></p>
                        <p>Leaves: <span className="font-bold text-gray-900">{req.rides?.departure_time}</span></p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
      
      <PassengerBottomNav /> 
    </div>
  );
}