"use client";

import * as React from "react";
import Link from "next/link";
import WorkplaceAutocomplete from "@/components/WorkplaceAutocomplete";
import { useRouter } from "next/navigation";
import { 
  MapPin, 
  Navigation, 
  Search, 
  Car, 
  User,
  Calendar as CalendarIcon,
  Users,
  Loader2,
  ArrowLeft,
  Plus,
  X,
  ChevronRight,
  Clock,
  AlertTriangle,
  ChevronLeft
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

const parseShiftToMinutes = (shiftStr: string) => {
  const parts = shiftStr.split('-');
  if (parts.length !== 2) return { start: 0, end: 0 };
  
  const parseTime = (t: string) => {
    const match = t.trim().match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (!match) return 0;
    let h = parseInt(match[1]);
    let m = parseInt(match[2] || '0');
    const ampm = match[3].toUpperCase();
    
    if (h === 12 && ampm === 'AM') h = 0;
    if (h < 12 && ampm === 'PM') h += 12;
    return (h * 60) + m;
  };

  let start = parseTime(parts[0]);
  let end = parseTime(parts[1]);
  if (end <= start) end += 24 * 60; 
  return { start, end };
};

const checkOverlap = (shift1: string, shift2: string) => {
  const s1 = parseShiftToMinutes(shift1);
  const s2 = parseShiftToMinutes(shift2);
  return Math.max(s1.start, s2.start) < Math.min(s1.end, s2.end);
};

const getFormattedDate = (date: Date) => date.toISOString().split('T')[0];

export default function SearchPage() {
  const router = useRouter(); 
  
  const [initialLoad, setInitialLoad] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  
  const [from, setFrom] = React.useState("");
  const [fromLat, setFromLat] = React.useState<number | null>(null);
  const [fromLng, setFromLng] = React.useState<number | null>(null);
  const [to, setTo] = React.useState("");
  
  const todayDate = new Date();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const [selectedDate, setSelectedDate] = React.useState<string>(getFormattedDate(todayDate)); 
  const [showCalendarModal, setShowCalendarModal] = React.useState(false);
  const [calendarViewDate, setCalendarViewDate] = React.useState(new Date());
  
  const [tripType, setTripType] = React.useState<'round_trip' | 'one_way'>('round_trip'); 
  const [shift, setShift] = React.useState("6AM - 2PM");
  
  const [showTimeModal, setShowTimeModal] = React.useState(false);
  const [timeStep, setTimeStep] = React.useState<'start' | 'end'>('start');
  const [customStart, setCustomStart] = React.useState({ h: "06", m: "00", p: "AM" });
  const [customEnd, setCustomEnd] = React.useState({ h: "02", m: "00", p: "PM" });

  const [friends, setFriends] = React.useState<FriendInput[]>([]);
  const [rawRequests, setRawRequests] = React.useState<any[]>([]);

  React.useEffect(() => {
    setSelectedDate(getFormattedDate(todayDate));

    async function fetchSavedProfileAndRequests() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('passenger_profiles')
          .select('postcode, home_latitude, home_longitude')
          .eq('id', user.id)
          .single();

        if (profile && profile.postcode) {
          setFrom(profile.postcode);
          setFromLat(profile.home_latitude);
          setFromLng(profile.home_longitude);
        }

        // We still fetch this under the hood solely to protect against double-bookings
        const { data: reqs } = await supabase
          .from('open_requests')
          .select('*')
          .eq('passenger_id', user.id)
          .eq('status', 'open');
        
        if (reqs && reqs.length > 0) {
          setRawRequests(reqs);
        }
      }
      setInitialLoad(false); 
    }
    fetchSavedProfileAndRequests();
  }, []);

  const formatPostcode = (value: string) => {
    let val = value.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
    if (val.length > 7) val = val.slice(0, 7); 
    if (val.length > 3) val = val.slice(0, val.length - 3) + ' ' + val.slice(val.length - 3);
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
    setSearchError(null);

    if (!from || !to) {
      setSearchError("Please fill in both your pickup and dropoff locations.");
      return;
    }
    if (friends.some(f => f.postcode.length < 5)) {
      setSearchError("Please complete all friend postcodes before searching.");
      return;
    }

    const searchShift = shift === "Custom" 
      ? `${customStart.h}:${customStart.m} ${customStart.p} - ${customEnd.h}:${customEnd.m} ${customEnd.p}` 
      : shift;

    if (selectedDate === getFormattedDate(new Date())) {
      const shiftMinutes = parseShiftToMinutes(searchShift);
      const now = new Date();
      const currentMinutes = (now.getHours() * 60) + now.getMinutes();
      
      if (shiftMinutes.start <= currentMinutes) {
        setSearchError("The start time for this shift has already passed today. Please adjust your time or select tomorrow.");
        return;
      }
    }

    // THE PASS-THROUGH LOGIC (Invisible guardrail)
    for (const req of rawRequests) {
      if (req.ride_date === selectedDate && checkOverlap(searchShift, req.shift_type)) {
        if (req.destination_hub.toLowerCase().trim() !== to.toLowerCase().trim()) {
          setSearchError(`You already have an active request to ${req.destination_hub} during these hours. You cannot commute to two different places at once!`);
          return; 
        }
      }
    }

    setLoading(true);

    const validFriends = friends.filter(f => f.postcode.length > 4).map(f => f.postcode).join(',');

    let finalLat = fromLat;
    let finalLng = fromLng;

    if (!finalLat || !finalLng) {
      try {
        const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(from + ', UK')}&format=json&limit=1`);
        const osmData = await osmRes.json();
        if (osmData && osmData.length > 0) {
          finalLat = parseFloat(osmData[0].lat);
          finalLng = parseFloat(osmData[0].lon);
        }
      } catch (err) {
        console.error("Geocoding failed");
      }
    }

    const queryParams = new URLSearchParams({
      from,
      to,
      date: selectedDate, 
      shift: searchShift,
      friends: validFriends,
      trip_type: tripType, 
      lat: finalLat?.toString() || "",
      lng: finalLng?.toString() || ""
    });

    router.push(`/search/results?${queryParams.toString()}`);
  };

  const generateCalendarGrid = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const todayStr = getFormattedDate(new Date());

    for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      const dateString = getFormattedDate(currentDate);
      const isPast = dateString < todayStr;
      const isSelected = dateString === selectedDate;

      days.push(
        <button
          key={dateString}
          type="button"
          disabled={isPast}
          onClick={() => {
            setSelectedDate(dateString);
            setShowCalendarModal(false);
            setSearchError(null);
          }}
          className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
            isSelected 
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-110' 
              : isPast 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28 flex flex-col">
      
      {/* PROFESSIONAL ERROR MODAL */}
      {searchError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
            <div className="mx-auto h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border border-red-100">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Wait a minute!</h3>
            <p className="text-sm text-gray-600 mb-8 font-medium leading-relaxed">{searchError}</p>
            <button 
              onClick={() => setSearchError(null)} 
              className="w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-md hover:bg-gray-800 transition-colors active:scale-95"
            >
              Understood
            </button>
          </div>
        </div>
      )}

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
          <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">
            Find your ride
          </h1>
          <p className="mt-2 text-sm font-bold text-gray-400">
            Match with verified drivers heading your way.
          </p>
        </div>

        {initialLoad ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
        ) : (
          <form onSubmit={handleSearch} className="animate-in fade-in rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm space-y-6">
            
            <div className="space-y-4 relative">
              <div className="space-y-1.5 relative z-20">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1">Leaving From</label>
                <WorkplaceAutocomplete 
                  value={from} 
                  onChange={(val) => { setFrom(val); setFromLat(null); setFromLng(null); }} 
                  placeholder="Postcode or Workplace..." 
                  icon="map-pin"
                />
              </div>

              <div className="space-y-1.5 relative z-10 pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1">Going To</label>
                <WorkplaceAutocomplete value={to} onChange={setTo} placeholder="Search workplaces..." icon="navigation" />
              </div>
            </div>

            <div className="h-px w-full bg-gray-100" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Travel Date</label>
              </div>
              
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setSelectedDate(getFormattedDate(todayDate)); setSearchError(null); }} 
                  className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all active:scale-95 ${selectedDate === getFormattedDate(todayDate) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200 hover:text-emerald-700'}`}
                >
                  Today
                </button>
                <button 
                  type="button" 
                  onClick={() => { setSelectedDate(getFormattedDate(tomorrowDate)); setSearchError(null); }} 
                  className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all active:scale-95 ${selectedDate === getFormattedDate(tomorrowDate) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200 hover:text-emerald-700'}`}
                >
                  Tomorrow
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowCalendarModal(true)}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm border-2 transition-all active:scale-95 ${
                  selectedDate !== getFormattedDate(todayDate) && selectedDate !== getFormattedDate(tomorrowDate) 
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                  : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200 hover:text-emerald-700'
                }`}
              >
                <CalendarIcon className="h-5 w-5" />
                <span>
                  {selectedDate !== getFormattedDate(todayDate) && selectedDate !== getFormattedDate(tomorrowDate) 
                    ? new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }) 
                    : 'Choose from calendar'}
                </span>
              </button>
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
                    onClick={() => { setShift(s); if (s === "Custom") setShowTimeModal(true); }}
                    className={`px-3 py-2 rounded-xl text-[11px] sm:text-xs font-black tracking-wide border-2 transition-all ${
                      shift === s ? "border-emerald-600 bg-emerald-600 text-white shadow-md" : "border-gray-100 bg-white text-gray-500 hover:border-emerald-200"
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
                      {customStart.h}:{customStart.m} {customStart.p} - {customEnd.h}:{customEnd.m} {customEnd.p}
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
                    <input type="text" placeholder="CF14 2QR" value={friend.postcode} onChange={(e) => updateFriend(friend.id, 'postcode', formatPostcode(e.target.value))} maxLength={8} className="w-full rounded-xl border border-emerald-200 bg-emerald-50/50 py-3 pl-8 pr-3 text-emerald-900 font-black tracking-widest uppercase focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div className="w-[20%]">
                    <input type="number" min="1" max="4" value={friend.seats} onChange={(e) => updateFriend(friend.id, 'seats', Number(e.target.value))} className="w-full rounded-xl border border-emerald-200 bg-emerald-50/50 py-3 px-2 text-emerald-900 font-black text-center focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <button type="button" onClick={() => removeFriend(friend.id)} className="w-[10%] flex justify-center text-red-400 hover:text-red-600 p-2"><X className="h-5 w-5" /></button>
                </div>
              ))}
            </div>

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-black text-white shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98] mt-4 disabled:opacity-50">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} Search Routes
            </button>
          </form>
        )}

      </main>

      {/* --- PROFESSIONAL CALENDAR MODAL --- */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm sm:items-center">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-black text-gray-900 text-xl tracking-tight">Select Date</h3>
                <p className="text-xs font-bold text-emerald-600 mt-1 uppercase tracking-widest">When are you traveling?</p>
              </div>
              <button onClick={() => setShowCalendarModal(false)} className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"><X className="h-4 w-4" /></button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="h-5 w-5 text-gray-600" /></button>
                <h4 className="font-black text-lg text-gray-900">
                  {calendarViewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </h4>
                <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="h-5 w-5 text-gray-600" /></button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <div key={day} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 justify-items-center">
                {generateCalendarGrid()}
              </div>
            </div>

            <button onClick={() => setShowCalendarModal(false)} className="w-full bg-gray-100 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- TIME ROLLER MODAL --- */}
      {showTimeModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm sm:items-center">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 pb-12 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-black text-gray-900 text-xl tracking-tight">Custom Shift Time</h3>
                <p className="text-xs font-bold text-emerald-600 mt-1 uppercase tracking-widest">{timeStep === 'start' ? '1. Select Start Time' : '2. Select End Time'}</p>
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

            {timeStep === 'start' ? (
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