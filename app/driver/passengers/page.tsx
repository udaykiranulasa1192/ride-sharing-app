"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, MapPin, Navigation, Phone, CheckCircle, Loader2, RadioTower } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PassengersBoard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [openJobs, setOpenJobs] = useState<any[]>([]);
  const [myClaimedJobs, setMyClaimedJobs] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      router.push("/driver/login");
      return;
    }
    setUser(authUser);

    // Fetch driver profile for the WhatsApp message
    const { data: profileData } = await supabase.from('driver_profiles').select('*').eq('id', authUser.id).single();
    if (profileData) setProfile(profileData);

    // Fetch jobs that are OPEN
    const { data: open } = await supabase
      .from('open_requests')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    // Fetch jobs that THIS driver has accepted
    const { data: claimed } = await supabase
      .from('open_requests')
      .select('*')
      .eq('accepted_by_driver', authUser.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    setOpenJobs(open || []);
    setMyClaimedJobs(claimed || []);
    setLoading(false);
  }

  const claimJob = async (job: any) => {
    if (!user || !profile) return;
    
    // Optimistic UI update (makes it feel instant!)
    setOpenJobs(openJobs.filter(j => j.id !== job.id));
    setMyClaimedJobs([{ ...job, status: 'accepted' }, ...myClaimedJobs]);

    // Database update
    const { error } = await supabase
      .from('open_requests')
      .update({ 
        status: 'accepted',
        accepted_by_driver: user.id 
      })
      .eq('id', job.id);

    if (error) {
      alert("Error claiming job. Someone else might have taken it.");
      fetchData(); // Refresh to true state if it fails
      return;
    }

    // Format Passenger Phone Number for UK WhatsApp
    let phoneStr = job.passenger_phone.replace(/[^0-9]/g, '');
    if (phoneStr.startsWith('0')) phoneStr = '44' + phoneStr.substring(1);
    else if (!phoneStr.startsWith('44')) phoneStr = '44' + phoneStr; 

    // Open WhatsApp Magic Link
    const message = `Hi ${job.passenger_name}, it's ${profile.first_name} from ShiftPool! 🚗 I've accepted your ride request to ${job.destination_hub} for the ${job.shift_type} shift. Let me know exactly where to pick you up!`;
    window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center gap-2">
        <RadioTower className="h-5 w-5 text-emerald-600 animate-pulse" />
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Jobs Board</h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-8">
        
        {/* SECTION 1: AVAILABLE REQUESTS */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Available Requests</h2>
          {openJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center shadow-sm">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No open requests right now.</p>
              <p className="text-xs text-gray-400 mt-1">Check back later for stranded passengers.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {openJobs.map(job => (
                <div key={job.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 text-lg">{job.passenger_name}</h3>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase px-2 py-1 rounded">Needs Ride</span>
                  </div>
                  
                  <div className="space-y-2 mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> <span className="font-bold text-gray-900">{job.outward_code}</span></div>
                    <div className="flex items-center gap-2"><Navigation className="h-4 w-4 text-emerald-600" /> <span className="font-bold text-gray-900">{job.destination_hub}</span></div>
                    <div className="inline-block mt-1 bg-gray-200 text-gray-700 text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm">{job.shift_type} shift</div>
                  </div>

                  <button onClick={() => claimJob(job)} className="w-full flex justify-center items-center gap-2 bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-md">
                    <Phone className="h-4 w-4" /> Accept & WhatsApp
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: MY CLAIMED JOBS */}
        {myClaimedJobs.length > 0 && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> My Claimed Passengers
            </h2>
            <div className="space-y-4">
              {myClaimedJobs.map(job => (
                <div key={job.id} className="bg-white rounded-2xl border-2 border-emerald-500 shadow-sm p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-sm">
                    Claimed
                  </div>
                  
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{job.passenger_name}</h3>
                  
                  <div className="space-y-1.5 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Pickup: <span className="font-bold text-gray-900">{job.outward_code}</span></div>
                    <div className="flex items-center gap-2"><Navigation className="h-4 w-4 text-emerald-600" /> Dropoff: <span className="font-bold text-gray-900">{job.destination_hub}</span></div>
                  </div>

                  {/* Secondary WhatsApp Button in case they closed the tab */}
                  <button 
                    onClick={() => {
                        let phoneStr = job.passenger_phone.replace(/[^0-9]/g, '');
                        if (phoneStr.startsWith('0')) phoneStr = '44' + phoneStr.substring(1);
                        else if (!phoneStr.startsWith('44')) phoneStr = '44' + phoneStr; 
                        window.open(`https://wa.me/${phoneStr}`, '_blank');
                    }}
                    className="flex items-center justify-center gap-2 w-full bg-emerald-50 text-emerald-700 border border-emerald-200 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <Phone className="h-5 w-5" /> Message {job.passenger_name} Again
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        
      </main>
    </div>
  );
}