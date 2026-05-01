"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  MapPin, 
  Navigation, 
  Sunrise, 
  Sun, 
  Moon, 
  Clock, 
  Search, 
  Car, 
  User 
} from "lucide-react";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import { supabase } from "@/lib/supabase";

const shifts = [
  { id: "morning", label: "Morning", time: "6AM - 2PM", icon: Sunrise },
  { id: "afternoon", label: "Afternoon", time: "2PM - 10PM", icon: Sun },
  { id: "night", label: "Night", time: "10PM - 6AM", icon: Moon },
  { id: "custom", label: "Custom", time: "Overtime", icon: Clock },
];

export default function SearchPage() {
  const router = useRouter();
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selectedShift, setSelectedShift] = React.useState<string>("morning");

  // --- DUAL AUTOCOMPLETE STATE ---
  const [locations, setLocations] = React.useState<{name: string}[]>([]);
  
  const [filteredFrom, setFilteredFrom] = React.useState<{name: string}[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = React.useState(false);

  const [filteredTo, setFilteredTo] = React.useState<{name: string}[]>([]);
  const [showToSuggestions, setShowToSuggestions] = React.useState(false);

  // 1. Fetch locations on mount
  React.useEffect(() => {
    async function loadLocations() {
      const { data, error } = await supabase.from('workplace_locations').select('name');
      if (!error && data) {
        setLocations(data);
      }
    }
    loadLocations();
  }, []);

  // 2. Autocomplete Handlers
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page refresh
    if (!from || !to) {
      alert("Please enter both a starting point and a destination.");
      return;
    }
    router.push(`/search/results?postcode=${encodeURIComponent(from)}&dest=${encodeURIComponent(to)}&shift=${selectedShift}`);
  };

  return (
    // pb-24 ensures the bottom nav doesn't cover the 'Find Available Seats' button
    <div className="min-h-screen bg-gray-50 pb-24 flex flex-col">
      
      {/* Header Area */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Car className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-emerald-600">ShiftPool</span>
        </div>
        
        <Link 
          href="/passenger/dashboard" 
          className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-full transition-colors"
        >
          <User className="h-4 w-4" />
          My Rides
        </Link>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 w-full flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Find your ride</h1>
          <p className="mt-1 text-sm text-gray-600">Match with drivers heading your way.</p>
        </div>

        <form onSubmit={handleSearch} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6">
          <div className="space-y-4">
            
            {/* Leaving From */}
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
                    <li 
                      key={`from-${i}`}
                      onClick={() => { setFrom(loc.name); setShowFromSuggestions(false); }}
                      className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-gray-900 text-sm border-b border-gray-50 last:border-0"
                    >
                      {loc.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Going To */}
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
                    <li 
                      key={`to-${i}`}
                      onClick={() => { setTo(loc.name); setShowToSuggestions(false); }}
                      className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-gray-900 text-sm border-b border-gray-50 last:border-0"
                    >
                      {loc.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />

          {/* Shift Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Your Shift</label>
            <div className="grid grid-cols-2 gap-2">
              {shifts.map((shift) => {
                const Icon = shift.icon;
                const isSelected = selectedShift === shift.id;
                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => setSelectedShift(shift.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border py-3 transition-all ${
                      isSelected ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? "text-emerald-600" : "text-gray-400"}`} />
                    <span className="text-sm font-semibold">{shift.label}</span>
                    <span className="text-[10px] uppercase tracking-wider">{shift.time}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-md transition-colors hover:bg-emerald-700 active:scale-[0.98]"
          >
            <Search className="h-5 w-5" />
            Find Available Seats
          </button>
        </form>
      </main>

      {/* The Bottom Nav component handles its own positioning, but pb-24 above makes room for it */}
      <PassengerBottomNav />
    </div>
  );
}