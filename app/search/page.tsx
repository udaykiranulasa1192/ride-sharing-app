"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  MapPin, 
  Navigation, 
  Search, 
  Car, 
  User,
  Calendar,
  Users,
  Loader2,
  ArrowLeft,
  Plus,
  X,
  ChevronRight
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

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = ["00", "15", "30", "45"];
const AMPM = ["AM", "PM"];

interface FriendInput {
  id: string;
  postcode: string;
  seats: number;
}

export default function SearchPage() {
  const router = useRouter(); // Added router for redirection
  const [loading, setLoading] = React.useState(false);
  
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  
  const [dateSelection, setDateSelection] = React.useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = React.useState("");

  const [tripType, setTripType] = React.useState<'round_trip' | 'one_way'>('round_trip'); 
  const [shift, setShift] = React.useState("6AM - 2PM");
  
  const [showTimeModal, setShowTimeModal] = React.useState(false);
  const [timeStep, setTimeStep] = React.useState<'start' | 'end'>('start');
  const [customStart, setCustomStart] = React.useState({ h: "06", m: "00", p: "AM" });
  const [customEnd, setCustomEnd] = React.useState({ h: "02", m: "00", p: "PM" });

  const [friends, setFriends] = React.useState<FriendInput[]>([]);

  const [locations, setLocations] = React.useState<{name: string}[]>([]);
  const [filteredFrom, setFilteredFrom] = React.useState<{name: string}[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = React.useState(false);
  const [filteredTo, setFilteredTo] = React.useState<{name: string}[]>([]);
  const [showToSuggestions, setShowToSuggestions] = React.useState(false);

  React.useEffect(() => {
    async function loadLocations() {
      const { data, error } = await supabase.from('workplace_locations').select('name');
      if (!error && data) setLocations(data);
    }
    loadLocations();
  }, []);

  const formatPostcode = (value: string) => {
    let val = value.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
    if (val.length > 7) val = val.slice(0, 7); 
    if (val.length > 3) {
      val = val.slice(0, val.length - 3) + ' ' + val.slice(val.length - 3);
    }
    return val;
  };

  const addFriend = () => {
    if (friends.length >= 4) return alert("You can only add up to 4 friends.");
    setFriends([...friends, { id: Date.now().toString(), postcode: "", seats: 1 }]);
  };

  const updateFriend = (id: string, field: keyof FriendInput, value: string | number) => {
    setFriends(friends.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeFriend = (id: string) => {
    setFriends(friends.filter(f => f.id !== id));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return alert("Please fill in locations.");
    
    let searchDate = customDate;
    if (dateSelection === 'today') searchDate = new Date().toISOString().split('T')[0];
    if (dateSelection === 'tomorrow') {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      searchDate = tmrw.toISOString().split('T')[0];
    }
    if (!searchDate) return alert("Please select a travel date.");

    if (friends.some(f => f.postcode.length < 5)) return alert("Please complete all friend postcodes.");

    setLoading(true);

    const searchShift = shift === "Custom" ? `${customStart.h}:${customStart.m} ${customStart.p}` : shift.split(" - ")[0];
    const validFriends = friends.filter(f => f.postcode.length > 4).map(f => f.postcode).join(',');

    // Build the URL parameters and navigate to the separate results page
    const queryParams = new URLSearchParams({
      from,
      to,
      date: searchDate,
      shift: searchShift,
      friends: validFriends
    });

    router.push(`/search/results?${queryParams.toString()}`);
  };

  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-gray-900 font-bold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400 placeholder:font-medium";

  return (
    <div className="min-h-screen bg-gray-50 pb-28 flex flex-col">
      <header className="sticky top-0 z-40 bg-gray-50/90 backdrop-blur px-4 py-3 flex items-center justify-between">
        <Link href="/passenger/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href="/passenger/dashboard" className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-white border border-emerald-100 shadow-sm hover:bg-emerald-50 px-3 py-2 rounded-full transition-colors">
          <User className="h-4 w-4" /> My Rides
        </Link>
      </header>

      <main className="mx-auto max-w-md px-4 pb-6 w-full flex-1 space-y-6">
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
              <Car className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-emerald-900">ShiftPool</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">Find your ride</h1>
          <p className="mt-2 text-sm font-bold text-gray-400">Match with verified drivers heading your way.</p>
        </div>

        <form onSubmit={handleSearch} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm space-y-6">
          
          <div className="space-y-4 relative">
            <div className="space-y-1.5 relative z-20">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Leaving From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="text" placeholder="Postcode or Area..." value={from} onChange={(e) => { setFrom(e.target.value); setShowFromSuggestions(e.target.value.length > 0); }} onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)} className={`${inputClass} pl-10 pr-4`} />
              </div>
              {showFromSuggestions && filteredFrom.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredFrom.map((loc, i) => <li key={i} onClick={() => { setFrom(loc.name); setShowFromSuggestions(false); }} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-gray-900 font-bold text-sm border-b border-gray-50">{loc.name}</li>)}
                </ul>
              )}
            </div>

            <div className="space-y-1.5 relative z-10">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Going To</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="text" placeholder="Workplace..." value={to} onChange={(e) => { setTo(e.target.value); setShowToSuggestions(e.target.value.length > 0); }} onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)} className={`${inputClass} pl-10 pr-4`} />
              </div>
              {showToSuggestions && filteredTo.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredTo.map((loc, i) => <li key={i} onClick={() => { setTo(loc.name); setShowToSuggestions(false); }} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-gray-900 font-bold text-sm border-b border-gray-50">{loc.name}</li>)}
                </ul>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Travel Date</label>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setDateSelection('today')} 
                className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${dateSelection === 'today' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200 hover:text-emerald-700'}`}
              >
                Today
              </button>
              <button 
                type="button" 
                onClick={() => setDateSelection('tomorrow')} 
                className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${dateSelection === 'tomorrow' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200 hover:text-emerald-700'}`}
              >
                Tomorrow
              </button>
            </div>
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => dateInputRef.current?.showPicker()}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm border-2 transition-all ${dateSelection === 'custom' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200 hover:text-emerald-700'}`}
              >
                <Calendar className="h-5 w-5" />
                <span>
                  {dateSelection === 'custom' && customDate 
                    ? new Date(customDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }) 
                    : 'Choose from calendar'}
                </span>
              </button>
              <input 
                ref={dateInputRef}
                type="date" 
                min={new Date().toISOString().split('T')[0]}
                value={customDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setCustomDate(e.target.value);
                    setDateSelection('custom');
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" 
              />
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />

          <div className="space-y-2">
             <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Ride Type</label>
             <div className="flex rounded-xl bg-gray-100 p-1">
               <button type="button" onClick={() => setTripType('round_trip')} className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all ${tripType === 'round_trip' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Round Trip</button>
               <button type="button" onClick={() => setTripType('one_way')} className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all ${tripType === 'one_way' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>One Way</button>
             </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Shift Timing</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SHIFTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setShift(s);
                    if (s === "Custom") setShowTimeModal(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-[11px] sm:text-xs font-black tracking-wide border-2 transition-all ${
                    shift === s
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : "border-gray-100 bg-white text-gray-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {shift === "Custom" && !showTimeModal && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center animate-in fade-in">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Custom Shift Set</p>
                  <p className="font-black text-sm text-emerald-900">
                    {customStart.h}:{customStart.m} {customStart.p} 
                    {tripType === 'round_trip' && ` - ${customEnd.h}:${customEnd.m} ${customEnd.p}`}
                  </p>
                </div>
                <button type="button" onClick={() => setShowTimeModal(true)} className="text-xs font-bold bg-emerald-200 hover:bg-emerald-300 text-emerald-900 px-3 py-1.5 rounded-lg transition-colors">
                  Edit Time
                </button>
              </div>
            )}
          </div>

          <div className="h-px w-full bg-gray-100" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Traveling with others?
              </label>
              {friends.length < 4 && (
                <button type="button" onClick={addFriend} className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg shadow-sm transition-colors">
                  <Plus className="h-3 w-3" /> Add Friend
                </button>
              )}
            </div>

            {friends.map((friend, index) => (
              <div key={friend.id} className="flex items-center gap-2 animate-in slide-in-from-top-2">
                <div className="w-[70%] relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/50 font-black text-sm">{index + 1}.</span>
                  <input type="text" placeholder="CF14 2QR" value={friend.postcode} onChange={(e) => updateFriend(friend.id, 'postcode', formatPostcode(e.target.value))} maxLength={8} className="w-full rounded-xl border border-emerald-200 bg-emerald-50/50 py-3 pl-8 pr-3 text-emerald-900 font-black tracking-widest uppercase focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-emerald-300 placeholder:font-medium" />
                </div>
                <div className="w-[20%]">
                  <input type="number" min="1" max="4" value={friend.seats} onChange={(e) => updateFriend(friend.id, 'seats', Number(e.target.value))} className="w-full rounded-xl border border-emerald-200 bg-emerald-50/50 py-3 px-2 text-emerald-900 font-black text-center focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <button type="button" onClick={() => removeFriend(friend.id)} className="w-[10%] flex justify-center text-red-400 hover:text-red-600 p-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-black text-white shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98] mt-4 disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} Search Routes
          </button>
        </form>

      </main>

      {showTimeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 backdrop-blur-sm sm:items-center">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 pb-12 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-black text-gray-900 text-xl tracking-tight">Custom Shift Time</h3>
                <p className="text-xs font-bold text-emerald-600 mt-1 uppercase tracking-widest">{tripType === 'round_trip' && timeStep === 'start' ? '1. Select Start Time' : tripType === 'round_trip' && timeStep === 'end' ? '2. Select End Time' : 'Select Travel Time'}</p>
              </div>
              <button onClick={() => setShowTimeModal(false)} className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex gap-4 justify-center items-center bg-gray-50 p-4 rounded-3xl border border-gray-100 mb-6 h-48 relative overflow-hidden mask-image-fade">
              <div className="absolute top-1/2 -translate-y-1/2 w-[80%] h-12 bg-white rounded-xl shadow-sm border border-gray-200 pointer-events-none z-0" />
              
              <div className="h-full w-20 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10 scroll-smooth relative" style={{ padding: '72px 0' }}>
                {HOURS.map(h => {
                  const isSelected = (timeStep === 'start' ? customStart.h : customEnd.h) === h;
                  return <div key={`h-${h}`} onClick={() => timeStep === 'start' ? setCustomStart({...customStart, h}) : setCustomEnd({...customEnd, h})} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'text-3xl font-black text-emerald-600' : 'text-xl font-bold text-gray-400 hover:text-gray-600'}`}>{h}</div>
                })}
              </div>
              <span className="text-2xl font-black text-gray-300 pb-1 z-10">:</span>
              
              <div className="h-full w-20 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10 scroll-smooth relative" style={{ padding: '72px 0' }}>
                {MINUTES.map(m => {
                  const isSelected = (timeStep === 'start' ? customStart.m : customEnd.m) === m;
                  return <div key={`m-${m}`} onClick={() => timeStep === 'start' ? setCustomStart({...customStart, m}) : setCustomEnd({...customEnd, m})} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'text-3xl font-black text-emerald-600' : 'text-xl font-bold text-gray-400 hover:text-gray-600'}`}>{m}</div>
                })}
              </div>

              <div className="h-full w-20 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10 scroll-smooth relative" style={{ padding: '72px 0' }}>
                {AMPM.map(p => {
                  const isSelected = (timeStep === 'start' ? customStart.p : customEnd.p) === p;
                  return <div key={`p-${p}`} onClick={() => timeStep === 'start' ? setCustomStart({...customStart, p}) : setCustomEnd({...customEnd, p})} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'text-2xl font-black text-emerald-600' : 'text-lg font-bold text-gray-400 hover:text-gray-600'}`}>{p}</div>
                })}
              </div>
            </div>

            {tripType === 'round_trip' && timeStep === 'start' ? (
              <button onClick={() => setTimeStep('end')} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all">
                Next: End Time <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button onClick={() => { setShowTimeModal(false); setTimeStep('start'); }} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all">
                Confirm Custom Shift
              </button>
            )}
          </div>
        </div>
      )}

      <PassengerBottomNav />
      
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-image-fade { -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent); mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent); }
      `}} />
    </div>
  );
}