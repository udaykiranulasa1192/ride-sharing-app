"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  MapPin, 
  Clock, 
  Users, 
  Loader2, 
  Car, 
  ArrowLeft,
  Banknote,
  Navigation
} from "lucide-react";
import Link from "next/link";
import DriverNav from "@/components/DriverNav";

export default function JobsBoard() {
  const router = useRouter();
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAndBundleJobs();
  }, []);

  async function fetchAndBundleJobs() {
    setLoading(true);

    // 1. RELATIONAL QUERY: Fetch the Master Pools AND their Child Passengers
    const { data: requests, error } = await supabase
      .from('open_requests')
      .select(`
        *,
        pool_passengers (
          id, passenger_id, pickup_postcode, seats, price
        )
      `)
      .eq('status', 'open')
      .order('ride_date', { ascending: true });

    if (error) console.error("Error fetching jobs:", error);

    if (!requests || requests.length === 0) {
      setBundles([]);
      setLoading(false);
      return;
    }

    // 2. Extract ALL unique passenger IDs from every pool's children
    const passengerIds = new Set<string>();
    requests.forEach(req => {
      if (req.pool_passengers) {
        req.pool_passengers.forEach((p: any) => passengerIds.add(p.passenger_id));
      }
    });

    // 3. Fetch Passenger Profiles for the manifest
    const { data: profilesData } = await supabase
      .from('passenger_profiles')
      .select('id, first_name, last_name')
      .in('id', Array.from(passengerIds));

    const pMap: Record<string, any> = {};
    profilesData?.forEach(p => { pMap[p.id] = p; });

    // 4. THE SMART FORMATTER: The database already bundled them, we just map it for the UI!
    const finalBundles = requests.map(req => {
      return {
        id: req.id,
        hub: req.destination_hub,
        date: req.ride_date,
        time: req.shift_type,
        tripType: req.trip_type || 'two_way',
        totalSeats: req.seats_needed,
        totalEarnings: Number(req.calculated_price || 0),
        pickupString: req.pickup_postcode, // Used to extract outward code
        passengers: (req.pool_passengers || []).map((p: any) => ({
          ...p,
          profile: pMap[p.passenger_id] || { first_name: 'Unknown', last_name: 'User' }
        }))
      };
    }).filter(pool => pool.passengers.length > 0) // Only show pools that actually have passengers
      .sort((a, b) => b.totalEarnings - a.totalEarnings); // Sort highest paying jobs to the top

    setBundles(finalBundles);
    setLoading(false);
  }

  // --- ONE-CLICK ROUTE CREATION ---
  const handleAcceptBundle = async (bundle: any) => {
    setProcessingId(bundle.id);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setProcessingId(null);
      return;
    }

    try {
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('first_name, last_name, vehicle_details')
        .eq('id', user.id)
        .single();

      const driverFullName = driverProfile 
        ? `${driverProfile.first_name} ${driverProfile.last_name}` 
        : "Verified Driver";

      const averagePrice = parseFloat((bundle.totalEarnings / bundle.totalSeats).toFixed(2));

      // Extract Outward Code (e.g., "CF14 2QR" -> "CF14")
      const firstPassengerPostcode = bundle.pickupString || "";
      const outwardCode = firstPassengerPostcode.trim().split(' ')[0].toUpperCase();

      // 1. Create a NEW RIDE for the driver
      const { data: newRide, error: rideError } = await supabase.from('rides').insert([{
        driver_id: user.id,
        driver_name: driverFullName,
        destination_hub: bundle.hub,
        ride_date: bundle.date,
        departure_time: bundle.time,
        shift_type: bundle.time,      
        trip_type: bundle.tripType,
        total_seats_capacity: 4,
        remaining_seats: 4 - bundle.totalSeats,
        price: averagePrice,
        status: 'active',
        vehicle: driverProfile?.vehicle_details || 'Standard Car',
        outward_code: outwardCode 
      }]).select().single();

      if (rideError) throw new Error(`Ride Creation Failed: ${rideError.message}`);

      // 2. Auto-Confirm all relational passengers to this new ride
      const matchesToInsert = bundle.passengers.map((p: any) => ({
        ride_id: newRide.id,
        passenger_id: p.passenger_id,
        pickup_postcode: p.pickup_postcode,
        seats_needed: p.seats, // Pulled from relational child table
        match_status: 'confirmed'
      }));

      const { error: matchError } = await supabase.from('trip_matches').insert(matchesToInsert);
      if (matchError) throw new Error(`Passenger Match Failed: ${matchError.message}`);

      // 3. Delete the Master Pool (ON DELETE CASCADE will automatically delete the child passengers)
      const { error: deleteError } = await supabase.from('open_requests').delete().eq('id', bundle.id);
      if (deleteError) throw new Error(`Jobs Board Cleanup Failed: ${deleteError.message}`);

      // 4. Route successfully claimed!
      router.push('/driver/dashboard');

    } catch (error: any) {
      console.error("Full Trace:", error);
      alert(error.message || "Something went wrong claiming this route.");
      setProcessingId(null);
    }
  };

  const displayDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/driver/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">Available Jobs</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* HERO BANNER */}
        <div className="bg-emerald-900 rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-20">
            <Banknote className="h-32 w-32" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-1">Live Marketplace</p>
            <h2 className="text-2xl font-black leading-tight mb-2">High-Profit Routes</h2>
            <p className="text-sm text-emerald-100 font-medium">We've bundled nearby passengers going to the same hub to maximize your earnings.</p>
          </div>
        </div>

        {bundles.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center">
            <Navigation className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="font-bold text-gray-400">No open requests right now.</p>
            <p className="text-xs text-gray-300 mt-1">Check back later when shifts end!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {bundles.map((bundle) => (
              
              /* THE EARNINGS-FIRST BUNDLE CARD */
              <div key={bundle.id} className="bg-white rounded-[32px] border-2 border-emerald-50 shadow-md shadow-emerald-600/5 overflow-hidden animate-in slide-in-from-bottom-4">
                
                {/* Header: Income Focus */}
                <div className="bg-emerald-50 px-6 py-5 flex justify-between items-center border-b border-emerald-100">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Guaranteed Earnings</p>
                    <p className="font-black text-3xl text-gray-900 leading-none">£{bundle.totalEarnings.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Seats</p>
                     <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200 inline-flex items-center gap-1.5 shadow-sm">
                       <Users className="h-4 w-4 text-emerald-600" />
                       <span className="font-black text-gray-900">{bundle.totalSeats} / 4</span>
                     </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Destination Info */}
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-gray-900 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Destination Hub</p>
                      <h4 className="font-black text-xl text-gray-900 leading-tight">{bundle.hub}</h4>
                      <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {displayDate(bundle.date)} at {bundle.time}
                      </p>
                    </div>
                  </div>

                  {/* The Stops (Passenger List) */}
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3 relative">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-2">Pickup Manifest</p>
                    
                    {bundle.passengers.map((p: any, idx: number) => (
                      <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                           <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">
                             {idx + 1}
                           </div>
                           <div>
                             <p className="font-black text-sm text-gray-900">{p.profile.first_name} {p.profile.last_name}</p>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.pickup_postcode}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-600 text-sm">+£{Number(p.price).toFixed(2)}</p>
                          <p className="text-[10px] font-bold text-gray-400">{p.seats} Seat(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Accept Button */}
                  <button 
                    onClick={() => handleAcceptBundle(bundle)}
                    disabled={!!processingId}
                    className="w-full bg-emerald-600 text-white font-black text-lg py-5 rounded-2xl flex justify-center items-center gap-2 hover:bg-emerald-700 transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {processingId === bundle.id ? <Loader2 className="h-6 w-6 animate-spin" /> : <Car className="h-6 w-6" />}
                    Accept Full Route
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      <DriverNav />
    </div>
  );
}