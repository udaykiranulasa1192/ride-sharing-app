"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Navigation, Clock, PoundSterling, Users, ShieldCheck, Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DriverPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [profile, setProfile] = React.useState<any>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  
  // --- FORM & AUTOCOMPLETE STATE ---
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [shiftType, setShiftType] = React.useState("morning");
  const [departureTime, setDepartureTime] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [seatsAvailable, setSeatsAvailable] = React.useState("3");

  const [locations, setLocations] = React.useState<{name: string}[]>([]);
  
  const [filteredFrom, setFilteredFrom] = React.useState<{name: string}[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = React.useState(false);

  const [filteredTo, setFilteredTo] = React.useState<{name: string}[]>([]);
  const [showToSuggestions, setShowToSuggestions] = React.useState(false);

  React.useEffect(() => {
    async function init() {
      // 1. Load Driver Profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/driver/login");
        return;
      }
      const { data: profileData } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) setProfile({ ...profileData, id: user.id });
      setLoadingProfile(false);

      // 2. Load Workplace Dictionary
      const { data: locData } = await supabase.from('workplace_locations').select('name');
      if (locData) setLocations(locData);
    }
    init();
  }, [router]);

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFrom(val);
    if (val.length > 0) {
      setFilteredFrom(locations.filter(l => l.name.toLowerCase().includes(val.toLowerCase())));
      setShowFromSuggestions(true);
    } else {
      setShowFromSuggestions(false);
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTo(val);
    if (val.length > 0) {
      setFilteredTo(locations.filter(l => l.name.toLowerCase().includes(val.toLowerCase())));
      setShowToSuggestions(true);
    } else {
      setShowToSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !from || !to) {
      alert("Please ensure both Starting Point and Destination are filled.");
      return;
    }
    setIsSubmitting(true);

    // Save the ride exactly as typed
    const { error } = await supabase.from('rides').insert([
      {
        driver_id: profile.id,
        driver_name: profile.full_name,
        vehicle: profile.car_model,
        outward_code: from, // Saved exactly as the driver typed/selected
        destination_hub: to, // Saved exactly as the driver typed/selected
        shift_type: shiftType,
        departure_time: departureTime,
        price: parseFloat(price),
        seats_available: parseInt(seatsAvailable),
      }
    ]);

    setIsSubmitting(false);

    if (error) {
      alert("Error posting ride. Please try again.");
      console.error(error);
    } else {
      router.push('/driver/dashboard');
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
        <Link href="/" className="mx-auto flex max-w-md items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Car className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">ShiftPool</span>
        </Link>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Offer a Ride</h1>
          <p className="mt-1 text-sm text-gray-600">Post your route and fill your empty seats.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-full">
              <User className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Posting As</p>
              <p className="text-sm font-bold text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-600">{profile?.car_model}</p>
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />

          {/* Route Details */}
          <div className="space-y-4">
            
            {/* FROM AUTOCOMPLETE */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Leaving From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input
                  required
                  type="text"
                  placeholder="Postcode or Workplace..."
                  value={from}
                  onChange={handleFromChange}
                  onFocus={() => { if (from.length > 0) setShowFromSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400"
                />
              </div>
              {showFromSuggestions && filteredFrom.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredFrom.map((loc, i) => (
                    <li key={`from-${i}`} onClick={() => { setFrom(loc.name); setShowFromSuggestions(false); }} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-gray-900 text-sm border-b border-gray-50 last:border-0 transition-colors">
                      {loc.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* TO AUTOCOMPLETE */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Going To</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input
                  required
                  type="text"
                  placeholder="Postcode or Workplace..."
                  value={to}
                  onChange={handleToChange}
                  onFocus={() => { if (to.length > 0) setShowToSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400"
                />
              </div>
              {showToSuggestions && filteredTo.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredTo.map((loc, i) => (
                    <li key={`to-${i}`} onClick={() => { setTo(loc.name); setShowToSuggestions(false); }} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-gray-900 text-sm border-b border-gray-50 last:border-0 transition-colors">
                      {loc.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>

          <div className="h-px w-full bg-gray-100" />

          {/* Shift & Time Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Shift</label>
              <select
                required
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Leaves At</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  required
                  type="text"
                  placeholder="5:15 AM"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-9 pr-3 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />

          {/* Price and Seats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Price per seat</label>
              <div className="relative">
                <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                <input
                  required
                  type="number"
                  step="0.50"
                  placeholder="4.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-9 pr-3 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Empty Seats</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                <input
                  required
                  type="number"
                  min="1"
                  max="6"
                  value={seatsAvailable}
                  onChange={(e) => setSeatsAvailable(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-9 pr-3 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-md transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
            {isSubmitting ? "Posting Ride..." : "Post Ride"}
          </button>
        </form>
      </main>
    </div>
  );
}