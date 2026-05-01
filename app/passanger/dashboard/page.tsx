"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Clock, CheckCircle, XCircle, Loader2, ArrowLeft, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function PassengerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      // 1. Get logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/passenger/login"); // Redirect if not logged in
        return;
      }

      // 2. Get their profile
      const { data: profileData } = await supabase.from('passenger_profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setProfile(profileData);

        // 3. Fetch all their ride requests and join the actual ride data so we know the driver's name
        const { data: requestsData } = await supabase
          .from('ride_requests')
          .select('*, rides(driver_name, vehicle, departure_time, outward_code, destination_hub)')
          .eq('passenger_phone', profileData.mobile_number)
          .order('created_at', { ascending: false });

        if (requestsData) setMyRequests(requestsData);
      }
      setLoading(false);
    }

    fetchDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/search" className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </Link>
          <span className="text-lg font-bold text-gray-900">My Bookings</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Profile Card */}
        <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-md">
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Logged in as</p>
          <h2 className="text-2xl font-extrabold">{profile?.first_name} {profile?.last_name}</h2>
          <p className="flex items-center gap-1.5 mt-2 text-sm text-emerald-50 font-medium">
            <MapPin className="h-4 w-4" /> Default Pickup: {profile?.postcode}
          </p>
        </div>

        {/* Bookings List */}
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 ml-1">Ride History</h3>
          
          {myRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center shadow-sm">
              <Car className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-4">You haven't requested any rides yet.</p>
              <Link href="/search" className="inline-block bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-emerald-700 transition-colors">
                Find a Ride
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
                  
                  {/* Status Banner */}
                  <div className={`px-4 py-2 text-xs font-bold uppercase flex items-center gap-1.5 ${
                    req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                    req.status === 'declined' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {req.status === 'pending' && <><Clock className="h-3.5 w-3.5"/> Pending Driver Approval</>}
                    {req.status === 'accepted' && <><CheckCircle className="h-3.5 w-3.5"/> Ride Confirmed!</>}
                    {req.status === 'declined' && <><XCircle className="h-3.5 w-3.5"/> Driver Declined</>}
                  </div>

                  <div className="p-4">
                    <h4 className="font-extrabold text-gray-900 text-lg mb-1">
                      {req.rides?.outward_code} to {req.rides?.destination_hub}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Driver: <span className="font-bold text-gray-900">{req.rides?.driver_name}</span> ({req.rides?.vehicle})
                      <br/>
                      Leaves: <span className="font-semibold text-gray-900">{req.rides?.departure_time}</span>
                    </p>

                    {req.status === 'pending' && (
                      <p className="text-xs text-gray-500 italic">
                        The driver has your request. They will review it shortly.
                      </p>
                    )}

                    {req.status === 'accepted' && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                        <p className="text-sm text-emerald-800 font-medium text-center">
                          The driver should message you on WhatsApp shortly to arrange the exact pickup spot.
                        </p>
                      </div>
                    )}

                    {req.status === 'declined' && (
                      <p className="text-xs text-red-500 italic">
                        Sorry, the driver couldn't take this request. Try searching for another ride!
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}