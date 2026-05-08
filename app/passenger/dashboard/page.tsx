"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Car, 
  MapPin, 
  Navigation, 
  MessageCircle, 
  Loader2, 
  LayoutDashboard,
  CheckCircle,
  Users,
  ArrowDown
} from "lucide-react";
import DriverNav from "@/components/DriverNav";
import Link from "next/link";

export default function DriverDashboard() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const [activeRide, setActiveRide] = useState<any | null>(null);
  const [passengers, setPassengers] = useState<any[]>([]);

  useEffect(() => {
    fetchDriverDashboard();
  }, []);

  async function fetchDriverDashboard() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);

    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch the driver's active upcoming ride
    const { data: rideData } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', user.id)
      .eq('status', 'active')
      .gte('ride_date', today)
      .order('ride_date', { ascending: true })
      .limit(1)
      .single();

    if (rideData) {
      setActiveRide(rideData);

      // 2. Fetch the passengers linked to this specific ride
      const { data: matches } = await supabase
        .from('trip_matches')
        .select(`
          *,
          passenger_profiles(first_name, last_name, mobile_number)
        `)
        .eq('ride_id', rideData.id)
        .eq('match_status', 'confirmed');

      setPassengers(matches || []);
    } else {
      setActiveRide(null);
      setPassengers([]);
    }

    setLoading(false);
  }

  const handleCompleteTrip = async () => {
    if (!activeRide) return;
    setCompletingId(activeRide.id);

    // Mark the ride as completed in the database
    await supabase
      .from('rides')
      .update({ status: 'completed' })
      .eq('id', activeRide.id);

    await fetchDriverDashboard();
    setCompletingId(null);
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-50 p-4 pb-32">
      <div className="max-w-md mx-auto pt-16 text-center">
        <div className="h-16 w-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <LayoutDashboard className="h-8 w-8 text-gray-900" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Driver Portal</h2>
        <p className="text-gray-500 text-sm mb-10">Sign in to manage your routes and earnings.</p>
        <Link href="/driver/profile" className="w-full block bg-gray-900 text-white font-bold py-3.5 rounded-xl">Go to Login</Link>
      </div>
      <DriverNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-5 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Active Route</h1>
          <div className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-100">
            {activeRide ? "ONLINE" : "OFFLINE"}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-6">
        
        {activeRide ? (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            
            {/* The Income Summary Card */}
            <div className="bg-gray-900 text-white rounded-2xl p-5 mb-6 shadow-xl shadow-gray-900/10">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Route Earnings</p>
              <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-4">
                <h2 className="text-4xl font-black">£{(activeRide.price * passengers.length).toFixed(2)}</h2>
                <div className="flex items-center gap-1.5 bg-gray-800 px-2.5 py-1 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm font-bold">{passengers.length} Pickups</span>
                </div>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-emerald-400">{formatShortDate(activeRide.ride_date)}</span>
                <span>Departure: {activeRide.departure_time}</span>
              </div>
            </div>

            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 mb-3">Pickup Manifest</h3>

            {/* The Timeline UI */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-1 shadow-sm">
              
              {/* Passengers (Pickups) */}
              {passengers.map((p, index) => {
                const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.pickup_postcode)}`;
                const phoneStr = p.passenger_profiles?.mobile_number?.replace('+', '') || "";
                const waLink = `https://wa.me/${phoneStr}?text=Hi ${p.passenger_profiles?.first_name}, I am your driver. I'm on my way to ${p.pickup_postcode}!`;

                return (
                  <div key={p.id} className="relative p-4 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200 shrink-0">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-none mb-1">
                            {p.passenger_profiles?.first_name} {p.passenger_profiles?.last_name}
                          </p>
                          <p className="text-xs font-semibold text-gray-500">{p.pickup_postcode}</p>
                        </div>
                      </div>
                      <p className="font-bold text-emerald-600 text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        +£{Number(p.rides?.price || activeRide.price).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-2 pl-9">
                      <a href={mapLink} target="_blank" rel="noreferrer" className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-gray-800 transition-colors">
                        <Navigation className="h-3 w-3" /> Navigate
                      </a>
                      <a href={waLink} target="_blank" rel="noreferrer" className="flex-1 bg-white border border-gray-200 text-gray-600 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                        <MessageCircle className="h-3 w-3" /> Message
                      </a>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-center -my-3 relative z-10">
                <div className="bg-gray-100 p-1 rounded-full border border-gray-200">
                  <ArrowDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Final Stop (Destination) */}
              <div className="p-4 pt-6 bg-gray-50 rounded-b-xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 pl-9">Final Destination</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0">
                    <MapPin className="h-3 w-3" />
                  </div>
                  <h4 className="font-bold text-gray-900">{activeRide.destination_hub}</h4>
                </div>
                
                <button 
                  onClick={handleCompleteTrip} 
                  disabled={!!completingId}
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-600/20"
                >
                  {completingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                  Complete Route
                </button>
              </div>

            </div>
          </div>
        ) : (
          
          /* EMPTY STATE */
          <div className="text-center py-20 px-4 animate-in fade-in">
            <div className="h-16 w-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Car className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No active routes</h3>
            <p className="text-gray-500 text-sm mb-8">You don't have any shifts scheduled for today. Check the live marketplace for jobs.</p>
            <Link href="/driver/jobs" className="bg-gray-900 text-white font-bold px-6 py-3.5 rounded-xl shadow-md hover:bg-gray-800 transition-all active:scale-95 inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Find Jobs
            </Link>
          </div>
        )}

      </main>

      <DriverNav />
    </div>
  );
}