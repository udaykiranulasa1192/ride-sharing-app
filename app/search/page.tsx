"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Search, 
  Car, 
  User, 
  ArrowLeft,
  Calendar,
  UserPlus,
  X
} from "lucide-react";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import { supabase } from "@/lib/supabase";

const PRESET_SHIFTS = [
  "6AM - 2PM",
  "2PM - 10PM",
  "10PM - 6AM",
  "6AM - 6PM",
  "8AM - 4PM",
  "Custom"
];

export default function SearchPage() {
  const router = useRouter();
  
  // Locations
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [locations, setLocations] = React.useState<{name: string}[]>([]);
  const [filteredFrom, setFilteredFrom] = React.useState<{name: string}[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = React.useState(false);
  const [filteredTo, setFilteredTo] = React.useState<{name: string}[]>([]);
  const [showToSuggestions, setShowToSuggestions] = React.useState(false);

  // Trip Type
  const [tripType, setTripType] = React.useState<'one_way' | 'round_trip'>('one_way');

  // Travel Date
  const [dateSelection, setDateSelection] = React.useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = React.useState("");

  // Shift & Timing
  const [selectedShift, setSelectedShift] = React.useState<string>("6AM - 2PM");
  const [customStartTime, setCustomStartTime] = React.useState("");
  const [customEndTime, setCustomEndTime] = React.useState("");

  // Add Friend Feature
  const [showFriend, setShowFriend] = React.useState(false);
  const [friendPostcode, setFriendPostcode] = React.useState("");

  React.useEffect(() => {
    async function loadLocations() {
      const { data, error } = await supabase.from('workplace_locations').select('name');
      if (!error && data) setLocations(data);
    }
    loadLocations();
  }, []);

  // Strict Postcode Formatter (CF14 2QR)
  const formatPostcode = (value: string) => {
    let val = value.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
    if (val.length > 7) val = val.slice(0, 7); 
    if (val.length > 3) {
      val = val.slice(0, val.length - 3) + ' ' + val.slice(val.length - 3);
    }
    return val;
  };

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
    e.preventDefault();
    if (!from || !to) {
      alert("Please enter both a starting point and a destination.");
      return;
    }
    
    // Calculate final date string
    let finalDate = customDate;
    if (dateSelection === 'today') finalDate = new Date().toISOString().split('T')[0];
    if (dateSelection === 'tomorrow') {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      finalDate = tmrw.toISOString().split('T')[0];
    }

    if (dateSelection === 'custom' && !finalDate) {
      alert("Please select a valid travel date.");
      return;
    }

    if (selectedShift === "Custom") {
        if (tripType === 'one_way' && !customStartTime) return alert("Please enter your travel time.");
        if (tripType === 'round_trip' && (!customStartTime || !customEndTime)) return alert("Please enter both start and end times.");
    }

    if (showFriend && friendPostcode.length < 5) {
      return alert("Please enter a valid complete postcode for your friend.");
    }

    // Pass everything to the results page securely via URL Params
    const query = new URLSearchParams({
      from,
      to,
      type: tripType,
      date: finalDate,
      shift: selectedShift,
      start: customStartTime,
      end: customEndTime,
      friend_postcode: showFriend ? friendPostcode : ''
    });

    router.push(`/passenger/search/results?${query.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 flex flex-col">
      
      {/* PROFESSIONAL HEADER WITH BACK BUTTON & LOGO */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-emerald-600 p-1.5 rounded-lg group-hover:bg-emerald-700 transition-colors">
              <Car className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight text-gray-900">ShiftPool</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 w-full flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Find your ride</h1>
          <p className="mt-1 text-sm font-bold text-gray-400">Match with drivers heading your way.</p>
        </div>

        <form onSubmit={handleSearch} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm space-y-6">
          
          {/* SECTION 1: TRIP TYPE */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button 
              type="button" 
              onClick={() => setTripType('one_way')} 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tripType === 'one_way' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              One Way
            </button>
            <button 
              type="button" 
              onClick={() => setTripType('round_trip')} 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tripType === 'round_trip' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Round Trip
            </button>
          </div>

          {/* SECTION 2: LOCATIONS */}
          <div className="space-y-4 relative">
            
            {/* Leaving From */}
            <div className="space-y-1.5 relative z-20">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Leaving From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input
                  required
                  type="text"
                  placeholder="Postcode or Area..."
                  value={from}
                  onChange={handleFromChange}
                  onFocus={() => { if (from.length > 0) setShowFromSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 font-bold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {showFromSuggestions && filteredFrom.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredFrom.map((loc, i) => (
                    <li 
                      key={`from-${i}`}
                      onClick={() => { setFrom(loc.name); setShowFromSuggestions(false); }}
                      className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-gray-900 font-bold text-sm border-b border-gray-50 last:border-0"
                    >
                      {loc.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Going To */}
            <div className="space-y-1.5 relative z-10">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Going To</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input
                  required
                  type="text"
                  placeholder="Workplace..."
                  value={to}
                  onChange={handleToChange}
                  onFocus={() => { if (to.length > 0) setShowToSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)} 
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 font-bold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {showToSuggestions && filteredTo.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredTo.map((loc, i) => (
                    <li 
                      key={`to-${i}`}
                      onClick={() => { setTo(loc.name); setShowToSuggestions(false); }}
                      className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-gray-900 font-bold text-sm border-b border-gray-50 last:border-0"
                    >
                      {loc.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* SECTION 3: DATE SELECTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Travel Date</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDateSelection('today')} className={`px-4 py-2 rounded-lg font-bold text-xs border ${dateSelection === 'today' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}>Today</button>
              <button type="button" onClick={() => setDateSelection('tomorrow')} className={`px-4 py-2 rounded-lg font-bold text-xs border ${dateSelection === 'tomorrow' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}>Tomorrow</button>
              <button type="button" onClick={() => setDateSelection('custom')} className={`px-4 py-2 rounded-lg font-bold text-xs border ${dateSelection === 'custom' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}>Select Date</button>
            </div>
            {dateSelection === 'custom' && (
              <div className="relative mt-2 animate-in fade-in slide-in-from-top-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="date" required value={customDate} onChange={(e) => setCustomDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 font-bold focus:ring-1 focus:ring-emerald-500 outline-none" />
              </div>
            )}
          </div>

          {/* SECTION 4: ADD FRIEND (OPTIONAL) */}
          <div className="pt-2 border-t border-gray-100">
            {!showFriend ? (
               <button type="button" onClick={() => setShowFriend(true)} className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700">
                 <div className="bg-emerald-100 p-1 rounded-md"><UserPlus className="h-4 w-4" /></div>
                 Add a friend to this request?
               </button>
            ) : (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 relative animate-in fade-in">
                <button type="button" onClick={() => { setShowFriend(false); setFriendPostcode(""); }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
                  <UserPlus className="h-3 w-3" /> Friend's Postcode
                </label>
                <input
                  type="text"
                  placeholder="e.g. CF14 2QR"
                  value={friendPostcode}
                  onChange={(e) => setFriendPostcode(formatPostcode(e.target.value))}
                  maxLength={8}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 font-black tracking-widest uppercase focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* SECTION 5: SHIFT TIMINGS */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Shift Details
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SHIFTS.map((shift) => (
                <button
                  key={shift}
                  type="button"
                  onClick={() => setSelectedShift(shift)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    selectedShift === shift 
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm" 
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>

            {/* CONDITIONAL CUSTOM TIMINGS */}
            {selectedShift === "Custom" && (
              <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                     {tripType === 'one_way' ? 'Travel Time' : 'Shift Start'}
                   </label>
                   <input type="time" value={customStartTime} onChange={e => setCustomStartTime(e.target.value)} required className="w-full py-2.5 px-3 rounded-lg border border-gray-200 bg-gray-50 font-bold outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                {tripType === 'round_trip' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Shift End</label>
                    <input type="time" value={customEndTime} onChange={e => setCustomEndTime(e.target.value)} required className="w-full py-2.5 px-3 rounded-lg border border-gray-200 bg-gray-50 font-bold outline-none focus:ring-1 focus:ring-emerald-500" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 text-base font-black text-white shadow-xl transition-colors hover:bg-black active:scale-[0.98] mt-2">
            <Search className="h-5 w-5" /> Search Drivers
          </button>
        </form>
      </main>

      <PassengerBottomNav />
    </div>
  );
}