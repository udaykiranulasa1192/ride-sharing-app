"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Calendar, Clock, PoundSterling, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import DriverAuthForm from "@/components/DriverAuthForm";
import Link from "next/link";

export default function PostRidePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [outwardCode, setOutwardCode] = useState("");
  const [destinationHub, setDestinationHub] = useState("Amazon DBS2");
  const [shiftType, setShiftType] = useState("morning");
  const [departureTime, setDepartureTime] = useState("");
  const [seats, setSeats] = useState("3");
  const [price, setPrice] = useState("4.50");

  const checkAuth = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }
    
    setIsLoggedIn(true);
    // Fetch their specific Driver Profile!
    const { data: profileData } = await supabase.from('driver_profiles').select('*').eq('id', user.id).single();
    if (profileData) setProfile(profileData);
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handlePostRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return alert("Error: Driver Profile not found. Please re-login.");
    
    setIsSubmitting(true);

    const { error } = await supabase.from('rides').insert([{
      driver_name: `${profile.first_name} ${profile.last_name}`,
      vehicle: profile.vehicle_details,
      price: parseFloat(price),
      seats_available: parseInt(seats),
      departure_time: departureTime,
      outward_code: outwardCode.toUpperCase(),
      destination_hub: destinationHub,
      shift_type: shiftType
    }]);

    setIsSubmitting(false);

    if (error) {
      alert("Failed to post ride. Please try again.");
    } else {
      router.push("/driver/dashboard"); // Send them to the job board!
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white px-4 py-4 border-b border-gray-200 shadow-sm flex items-center gap-3 sticky top-0 z-50">
        <Link href="/driver/dashboard" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-700" />
        </Link>
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Post a Ride</h1>
      </header>

      <main className="max-w-md mx-auto p-4 mt-4">
        {!isLoggedIn || !profile ? (
          <DriverAuthForm onSuccess={checkAuth} />
        ) : (
          <form onSubmit={handlePostRide} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-5">
            
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-medium border border-blue-100 flex items-center gap-3">
              <Car className="h-6 w-6 text-blue-600 shrink-0" />
              Posting as {profile.first_name} ({profile.vehicle_details})
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-500">Leaving From (Town/City)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="text" placeholder="e.g. Cardiff" value={outwardCode} onChange={(e) => setOutwardCode(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-500">Destination Hub</label>
              <select value={destinationHub} onChange={(e) => setDestinationHub(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 px-4 text-sm text-gray-900 focus:border-blue-500 outline-none">
                <option value="Amazon DBS2">Amazon DBS2</option>
                <option value="Amazon CWL1">Amazon CWL1</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Shift</label>
                <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 px-4 text-sm text-gray-900 focus:border-blue-500 outline-none">
                  <option value="morning">Morning</option>
                  <option value="night">Night</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Departure Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input required type="text" placeholder="05:30 AM" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-9 pr-4 text-sm text-gray-900 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Seats</label>
                <input required type="number" min="1" max="6" value={seats} onChange={(e) => setSeats(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 px-4 text-sm text-gray-900 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Price per Seat</label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input required type="number" step="0.50" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-9 pr-4 text-sm text-gray-900 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full mt-2 rounded-xl bg-blue-600 py-4 text-sm font-bold text-white transition-colors hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Publish Ride"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}