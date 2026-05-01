"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Car, MapPin, Clock, Loader2, RadioTower, ShieldCheck, Hash, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DriverDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Dashboard Data
  const [myRides, setMyRides] = useState<any[]>([]);
  const [openRequests, setOpenRequests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/driver/login"); // Redirect to login if not authenticated
        return;
      }

      // 1. Fetch the Driver Profile we just created!
      const { data: profileData } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        const fullName = `${profileData.first_name} ${profileData.last_name}`;

        // 2. Fetch the rides this driver has posted
        const { data: ridesData } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_name', fullName)
          .order('created_at', { ascending: false });
        
        if (ridesData) setMyRides(ridesData);

        // 3. Fetch Passenger Broadcasts (Open Requests)
        const { data: requestsData } = await supabase
          .from('open_requests')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false });
        
        if (requestsData) setOpenRequests(requestsData);
      }
      
      setLoading(false);
    }

    fetchDashboardData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-4 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Driver Hub</h1>
        <button onClick={handleLogout} className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Log Out">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* PROFILE CARD */}
        {profile && (
          <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
            <ShieldCheck className="absolute -bottom-4 -right-4 h-24 w-24 text-blue-500 opacity-30" />
            <div className="relative z-10">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">Verified Driver</p>
              <h2 className="text-2xl font-black mb-3">{profile.first_name} {profile.last_name}</h2>
              
              <div className="bg-blue-700/50 rounded-xl p-3 space-y-2 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Car className="h-4 w-4 text-blue-300" />
                  {profile.vehicle_details}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Hash className="h-4 w-4 text-blue-300" />
                  <span className="uppercase tracking-wider">{profile.registration_number}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTION BUTTON */}
        <Link href="/driver/post" className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-all flex justify-center items-center gap-2">
          <Car className="h-5 w-5" />
          Post a New Ride
        </Link>

        {/* OPEN PASSENGER REQUESTS (THE OPPORTUNITIES BOARD) */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
            <RadioTower className="h-4 w-4 text-emerald-500 animate-pulse" />
            Opportunities Board
          </h3>
          
          {openRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
              <p className="text-gray-500 text-sm font-medium">No open passenger requests right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden ring-1 ring-emerald-50 relative">
                  <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Passenger Request
                  </div>
                  <div className="p-4 pt-6">
                    <h4 className="font-black text-gray-900 uppercase text-lg mb-1">{req.outward_code} → {req.destination_hub}</h4>
                    <p className="text-sm text-gray-600 mb-4">Shift: <span className="font-bold uppercase text-gray-900">{req.shift_type}</span></p>
                    <button className="w-full rounded-xl bg-emerald-50 py-3 text-sm font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                      Accept & Contact Passenger
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MY SCHEDULED DRIVES */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">My Scheduled Drives</h3>
          
          {myRides.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
              <Car className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm font-medium">You haven't posted any rides yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRides.map((ride) => (
                <div key={ride.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 uppercase">{ride.outward_code} → {ride.destination_hub}</h4>
                    <span className="font-black text-blue-600">£{ride.price}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {ride.departure_time}</div>
                    <div className="flex items-center gap-1.5"><Car className="h-4 w-4" /> {ride.seats_available} seats</div>
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