"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Rss, 
  MapPin, 
  Navigation, 
  Clock, 
  Users, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Calendar
} from "lucide-react";
import Link from "next/link";
import DriverNav from "@/components/DriverNav";
import { useRouter } from "next/navigation";

export default function JobsBoard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    
    // Fetch all open requests and join with the passenger's profile
    const { data, error } = await supabase
      .from('open_requests')
      .select(`
        *,
        passenger_profiles:passenger_id(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  }

 const handleAcceptJob = async (job: any) => {
    setProcessingId(job.id);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/driver/login");
      return;
    }

    try {
      // 1. SMART CHECK: Use .maybeSingle() so it doesn't crash if they have no rides!
      const { data: existingRide, error: existingError } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .eq('ride_date', job.ride_date)
        .eq('shift_type', job.shift_type)
        .eq('status', 'active')
        .maybeSingle();

      if (existingError) throw new Error(`Existing Ride Check Failed: ${existingError.message}`);

      let targetRideId;

      if (existingRide) {
        if (existingRide.remaining_seats < job.seats_needed) {
          throw new Error("You don't have enough seats left in your current ride to accept this job!");
        }
        
        targetRideId = existingRide.id;
        
        const { error: updateError } = await supabase.from('rides').update({
          remaining_seats: existingRide.remaining_seats - job.seats_needed
        }).eq('id', targetRideId);

        if (updateError) throw new Error(`Seat Update Failed: ${updateError.message}`);

      } else {
        // 2. CREATE NEW RIDE
        const { data: profile } = await supabase.from('driver_profiles').select('*').eq('id', user.id).maybeSingle();
        
        const { data: newRide, error: rideError } = await supabase.from('rides').insert([{
          driver_id: user.id,
          driver_name: profile ? `${profile.first_name} ${profile.last_name}` : "Driver",
          vehicle: profile?.vehicle_details || "Standard Vehicle",
          outward_code: job.pickup_postcode, 
          destination_hub: job.destination_hub,
          shift_type: job.shift_type,
          departure_time: job.shift_type.includes('-') ? job.shift_type.split(' - ')[0] : job.shift_type,
          trip_type: 'one_way',
          ride_date: job.ride_date,
          price: 4.50, 
          total_seats_capacity: 4,
          remaining_seats: 4 - job.seats_needed,
          status: 'active'
        }]).select().single();

        if (rideError) throw new Error(`Ride Auto-Generation Failed: ${rideError.message}`);
        targetRideId = newRide.id;
      }

      // 3. THE HANDSHAKE
      const { error: matchError } = await supabase.from('trip_matches').insert([{
        ride_id: targetRideId,
        passenger_id: job.passenger_id,
        pickup_postcode: job.pickup_postcode,
        seats_needed: job.seats_needed,
        match_status: 'confirmed'
      }]);

      if (matchError) throw new Error(`Match Confirmation Failed: ${matchError.message}`);

      // 4. CLEANUP
      const { error: deleteError } = await supabase.from('open_requests').delete().eq('id', job.id);
      
      if (deleteError) throw new Error(`Broadcast Deletion Failed: ${deleteError.message}`);

      // If it makes it here, everything worked perfectly!
      await fetchJobs();
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 3000);

    } catch (err: any) {
      console.error("Job Acceptance Error:", err);
      // This will instantly tell you exactly which step failed and why!
      alert(err.message || "An unexpected error occurred while claiming the job.");
    } finally {
      setProcessingId(null);
    }
    setTimeout(() => setSuccessBanner(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
            <Rss className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">Jobs Board</h1>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Live Passenger Broadcasts</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* SUCCESS BANNER */}
        {successBanner && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-600/20 animate-in slide-in-from-top-2">
            <CheckCircle className="h-6 w-6 text-emerald-200" />
            <div>
              <p className="font-black text-sm">Job Accepted!</p>
              <p className="text-xs font-medium text-emerald-100">The passenger has been added to your Dashboard.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Available Pickups</h2>
          <span className="text-[10px] font-black bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{jobs.length} Active</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="text-sm font-bold text-gray-400 animate-pulse">Scanning network...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-gray-200 p-8 text-center shadow-sm mt-4">
            <div className="mx-auto h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <AlertCircle className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="font-black text-gray-900 text-xl mb-1">No Broadcasts</h3>
            <p className="text-gray-500 text-sm">There are no passengers currently looking for a ride. Check back later!</p>
          </div>
        ) : (
          jobs.map((job) => {
            const passenger = job.passenger_profiles || { first_name: 'Unknown', last_name: 'Passenger' };

            return (
              <div key={job.id} className="bg-white rounded-[24px] border-2 border-emerald-50 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-black text-xl border border-gray-200">
                        {passenger.first_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg leading-none mb-1">
                          {passenger.first_name} {passenger.last_name}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                          <Users className="h-3 w-3" /> Needs {job.seats_needed} Seat{job.seats_needed > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-5 space-y-3">
                    <div className="flex items-center gap-3">
                       <MapPin className="h-5 w-5 text-gray-400" />
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Pickup Location</p>
                         <p className="font-black text-gray-900 leading-none">{job.pickup_postcode}</p>
                       </div>
                    </div>
                    <div className="h-px w-full bg-gray-200" />
                    <div className="flex items-center gap-3">
                       <Navigation className="h-5 w-5 text-gray-400" />
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Going To</p>
                         <p className="font-black text-emerald-700 leading-none">{job.destination_hub}</p>
                       </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-5 px-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(job.ride_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {job.shift_type}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleAcceptJob(job)} 
                    disabled={processingId === job.id}
                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 shadow-md shadow-emerald-600/20"
                  >
                    {processingId === job.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    Accept Job
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      <DriverNav />
    </div>
  );
}