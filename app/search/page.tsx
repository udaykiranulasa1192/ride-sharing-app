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
  Radio,
  Clock,
  XCircle,
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

// THE FIX: Forces Local Timezone formatting to prevent UTC day-shifting!
const getFormattedDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedDate(getFormattedDate(todayDate));

    async function fetchSavedProfileAndRequests() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
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

        const { data: openReqs } = await supabase
          .from('open_requests')
          .select(`
            *,
            pool_passengers (
              id, passenger_id, pickup_postcode, seats, price
            )
          `)
          .eq('status', 'open');
        
        if (openReqs && openReqs.length > 0) {
          const myActiveReqs = openReqs.filter(req => 
            req.pool_passengers && req.pool_passengers.some((p: any) => p.passenger_id === user.id)
          );
          setRawRequests(myActiveReqs);
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

  const cancelActiveRequest = async (reqId: string) => {
    setCancellingId(reqId);
    
    const reqToCancel = rawRequests.find(r => r.id === reqId);
    if (!reqToCancel || !currentUserId) return;

    const myRecord = reqToCancel.pool_passengers.find((p: any) => p.passenger_id === currentUserId);

    if (myRecord) {
       const remainingSeats = reqToCancel.seats_needed - myRecord.seats;
       
       if (remainingSeats <= 0) {
          await supabase.from('open_requests').delete().eq('id', reqToCancel.id);
       } else {
          await supabase.from('open_requests').update({
             seats_needed: remainingSeats,
             calculated_price: reqToCancel.calculated_price - myRecord.price
          }).eq('id', reqToCancel.id);
          
          await supabase.from('pool_passengers').delete().eq('id', myRecord.id);
       }
    }

    setRawRequests(prev => prev.filter(r => r.id !== reqId));
    setCancellingId(null);
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
          <div className="space-y-8">
            
            {rawRequests.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2 justify-center mb-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-2 bg-emerald-50 rounded-full py-1">Your Active Broadcasts</span>
                </div>
                {rawRequests.map((req) => (
                  <div key={req.id} className="bg-white border-2 border-emerald-500 rounded-[24px] overflow-hidden shadow-sm shadow-emerald-600/10 text-left relative">
                    
                    <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                      <Radio className="h-32 w-32 text-emerald-600" />
                    </div>
                    
                    <div className="p-5 border-b border-emerald-50 flex justify-between items-start relative z-10">
                      <div>
                        <h4 className="font-black text-gray-900 text-lg mb-1 tracking-tight">Looking for Driver</h4>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Broadcasting...
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Offered Fare</p>
                        <p className="font-black text-xl text-emerald-600 leading-none">£{req.calculated_price.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/30 relative z-10">
                      <div className="flex justify-between items-center bg-white rounded-xl p-3 border border-emerald-100/50 shadow-sm mb-3">
                        <div>
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Shift</p>
                           <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-500"/> {req.shift_type}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Date</p>
                           <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 justify-end"><CalendarIcon className="h-3.5 w-3.5 text-emerald-500"/> {new Date(req.ride_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short'})}</p>
                        </div>
                      </div>

                      <div className="relative pl-6 space-y-3">
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-emerald-200 rounded-full"></div>
                        <div className="relative">
                          <div className="absolute -left-6 top-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-emerald-50 shadow-sm"></div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pickups ({req.seats_needed} Seats)</p>
                          <div className="flex flex-col gap-2">
                            {req.pool_passengers?.map((passenger: any, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-sm font-black text-gray-900 leading-tight bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">
                                  {passenger.pickup_postcode.trim()}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  {passenger.seats} Seat(s)
                                </span>
                                {passenger.passenger_id === currentUserId && (
                                   <span className="text-[10px] font-black text-white bg-emerald-500 px-1.5 py-0.5 rounded">YOU</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="relative pt-1">
                          <div className="absolute -left-6 top-2 h-3 w-3 bg-gray-900 rounded-sm border-2 border-emerald-50 shadow-sm"></div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Destination</p>
                          <p className="text-sm font-black text-gray-900 leading-tight">{req.destination_hub}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white relative z-10 border-t border-emerald-50">
                       <button 
                        onClick={() => cancelActiveRequest(req.id)}
                        disabled={cancellingId === req.id}
                        className="w-full bg-red-50 text-red-600 border border-red-100 font-bold py-3 rounded-xl hover:bg-red-100 transition-all flex justify-center items-center gap-2 disabled:opacity-50 active:scale-[0.98] text-sm"
                       >
                        {cancellingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Revoke Request
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
          </div>
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