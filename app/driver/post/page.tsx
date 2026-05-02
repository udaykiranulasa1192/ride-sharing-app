"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, Navigation, Calendar, Clock, Users, Car, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PostRidePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [driverProfile, setDriverProfile] = useState<any>(null);

  // Form State
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [shiftTime, setShiftTime] = useState("06:00 - 14:00");
  const [seats, setSeats] = useState(3);

  // Shift block presets (matches your earlier 6AM-2PM requirements)
  const shiftOptions = [
    "06:00 - 14:00",
    "14:00 - 22:00",
    "22:00 - 06:00",
    "08:00 - 16:00"
  ];

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/driver/login');
        return;
      }
      const { data } = await supabase.from('driver_profiles').select('*').eq('id', user.id).single();
      if (data) setDriverProfile(data);
    }
    fetchProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!driverProfile) {
      setError("Driver profile not found. Please log in again.");
      setLoading(false);
      return;
    }

    // Split the shift time for the database
    const [start] = shiftTime.split(" - ");

    const { error: insertError } = await supabase.from('rides').insert([{
      driver_id: driverProfile.id,
      driver_name: `${driverProfile.first_name} ${driverProfile.last_name}`,
      vehicle: driverProfile.vehicle_details,
      ride_date: date,
      departure_time: start, // Using start time as the departure reference
      trip_type: 'one_way', // MVP default
      base_price_per_person: 5.00, // MVP flat rate
      total_seats_capacity: seats,
      remaining_seats: seats,
      destination_hub: destination,
      status: 'active'
    }]);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/driver/dashboard'), 1500);
    }
  };

  if (!driverProfile) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-md mx-auto p-4 pt-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/driver/dashboard" className="p-2 -ml-2 bg-gray-100 rounded-full hover:bg-gray-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Post a Shift</h1>
      </div>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-emerald-900">Shift Posted!</h2>
          <p className="text-sm font-bold text-emerald-700 mt-2">Redirecting to your dashboard...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl">{error}</div>}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Destination Workplace</label>
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
              <input required type="text" placeholder="e.g. Amazon DBS2" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
              <input required type="date" min={new Date().toISOString().split('T')[0]} value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Shift Block</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
              <select required value={shiftTime} onChange={(e) => setShiftTime(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold appearance-none">
                {shiftOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Available Seats</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
              <input required type="number" min="1" max="6" value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Car className="h-5 w-5" />}
              Broadcast Empty Seats
            </button>
          </div>
        </form>
      )}
    </div>
  );
}