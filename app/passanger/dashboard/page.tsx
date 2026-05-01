"use client";

import { useEffect, useState } from "react";
import { 
  Car, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowLeft, 
  Lock, 
  ArrowRight, 
  ShieldCheck,
  Info
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import PassengerBottomNav from "@/components/PassengerBottomNav";

export default function PassengerDashboard() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 1. Check if user exists
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }

        setIsLoggedIn(true);

        // 2. Get their profile
        const { data: profileData } = await supabase
          .from('passenger_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);

          // 3. Fetch all their ride requests
          // Joining with 'rides' table to get driver and trip details
          const { data: requestsData, error } = await supabase
            .from('ride_requests')
            .select('*, rides(driver_name, vehicle, departure_time, outward_code, destination_hub)')
            .eq('passenger_phone', profileData.mobile_number)
            .order('created_at', { ascending: false });

          if (!error && requestsData) {
            setMyRequests(requestsData);
          }
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Universal Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/search" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 uppercase tracking-tight">My Bookings</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* --- STATE 1: LOGGED OUT --- */}
        {!isLoggedIn ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center shadow-sm mt-8">
            <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-5 border border-gray-100">
              <Lock className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Track Your Rides</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Log in to see your upcoming shifts, check driver approvals, and get pickup details.
            </p>
            <Link 
              href="/passenger/signup" 
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] shadow-sm"
            >
              Log In / Sign Up <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          
          /* --- STATE 2: LOGGED IN --- */
          <>
            {/* Profile Summary */}
            <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Passenger Profile</p>
                  <h2 className="text-2xl font-extrabold">{profile?.first_name} {profile?.last_name}</h2>
                </div>
                <div className="bg-emerald-500/30 p-2 rounded-lg">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-50 bg-emerald-700/30 p-2 rounded-xl">
                <MapPin className="h-4 w-4" />
                <span>Pickup: {profile?.postcode}</span>
              </div>
            </div>

            {/* Ride List */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 ml-1">Ride History</h3>
              
              {myRequests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                  <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No requests found.</p>
                  <Link href="/search" className="mt-4 inline-block text-emerald-600 font-bold hover:underline">
                    Find a ride now
                  </Link>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Status Banner */}
                    <div className={`px-4 py-2 text-[10px] font-black uppercase flex items-center gap-1.5 ${
                      req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'declined' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {req.status === 'pending' && <><Clock className="h-3.5 w-3.5"/> Pending Approval</>}
                      {req.status === 'accepted' && <><CheckCircle className="h-3.5 w-3.5"/> Confirmed</>}
                      {req.status === 'declined' && <><XCircle className="h-3.5 w-3.5"/> Declined</>}
                    </div>

                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 uppercase">
                            {req.rides?.outward_code} → {req.rides?.destination_hub}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {req.rides?.vehicle} • Driver: {req.rides?.driver_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase">Leaves</p>
                          <p className="text-sm font-black text-gray-900">{req.rides?.departure_time}</p>
                        </div>
                      </div>

                      {req.status === 'accepted' && (
                        <div className="mt-2 flex items-center gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                          <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                          <p className="text-[11px] text-emerald-800 font-medium leading-tight">
                            Driver will WhatsApp you shortly to confirm the pickup spot.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Safety Footer */}
            <div className="bg-gray-100 rounded-2xl p-4 flex items-center gap-3">
               <ShieldCheck className="h-5 w-5 text-gray-400" />
               <p className="text-[10px] text-gray-500 leading-snug">
                 Contact details are only shared once a driver accepts your seat request.
               </p>
            </div>
          </>
        )}
      </main>

      {/* Persistent Bottom Navigation */}
      <PassengerBottomNav /> 
    </div>
  );
}