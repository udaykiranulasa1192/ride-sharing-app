"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, MapPin, Navigation, PoundSterling, Users, ShieldCheck, Loader2, ArrowRight, RefreshCcw, CalendarDays, AlertCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

const predefinedShifts = [
  "6AM - 2PM",
  "8AM - 4PM",
  "6AM - 6PM",
  "2PM - 10PM",
  "10PM - 6AM",
  "Custom"
];

// Helper arrays for the time sliders
const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

export default function DriverHomePage() {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Form State
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tripType, setTripType] = useState<'one_way' | 'round_trip'>('round_trip');
  const [dateSelection, setDateSelection] = useState<'today' | 'tomorrow' | 'specific'>('today');
  const [specificDate, setSpecificDate] = useState("");
  
  const [shiftType, setShiftType] = useState("");
  const [price, setPrice] = useState("4.50");
  const [seatsAvailable, setSeatsAvailable] = useState("3");

  // Custom Time Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  
  const [startHour, setStartHour] = useState("06");
  const [startMin, setStartMin] = useState("00");
  const [startAmPm, setStartAmPm] = useState("AM");
  
  const [endHour, setEndHour] = useState("02");
  const [endMin, setEndMin] = useState("00");
  const [endAmPm, setEndAmPm] = useState("PM");

  // Final saved custom string
  const [savedCustomString, setSavedCustomString] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/driver/login");
        return;
      }
      
      const { data: profileData } = await supabase.from('driver_profiles').select('*').eq('id', user.id).single();
      if (profileData) setProfile(profileData);
      setLoadingProfile(false);
    }
    init();
  }, [router]);

  const handleShiftSelect = (shift: string) => {
    setErrorMsg(null);
    if (shift === "Custom") {
      setIsCustomModalOpen(true);
    } else {
      setShiftType(shift);
      setSavedCustomString("");
    }
  };

  const handleSaveCustomTime = () => {
    const formattedStart = `${startHour}:${startMin} ${startAmPm}`;
    let finalString = formattedStart;

    if (tripType === 'round_trip') {
      const formattedEnd = `${endHour}:${endMin} ${endAmPm}`;
      finalString = `${formattedStart} - ${formattedEnd}`;
    }

    setSavedCustomString(finalString);
    setShiftType("Custom");
    setIsCustomModalOpen(false);
    setErrorMsg(null);
  };

  const handleCancelCustomTime = () => {
    setIsCustomModalOpen(false);
    if (shiftType === "Custom" && !savedCustomString) {
      setShiftType(""); 
    }
  };

  const openCalendar = () => {
    if (dateInputRef.current) {
      // @ts-ignore
      dateInputRef.current.showPicker();
    }
  };

  const getCalculatedDate = () => {
    const today = new Date();
    if (dateSelection === 'today') return today.toISOString().split('T')[0];
    if (dateSelection === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    return specificDate; 
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!profile) return;
    if (!from.trim()) return setErrorMsg("Please enter your departure location.");
    if (!to.trim()) return setErrorMsg("Please enter your destination.");
    if (dateSelection === 'specific' && !specificDate) return setErrorMsg("Please select a specific date for travel.");
    if (!shiftType) return setErrorMsg("Please select your shift timings.");
    if (parseFloat(price) < 0) return setErrorMsg("Price cannot be a negative value.");
    if (parseInt(seatsAvailable) < 1) return setErrorMsg("You must have at least 1 seat available.");

    setIsSubmitting(true);
    const fullName = `${profile.first_name} ${profile.last_name}`;
    const rideDate = getCalculatedDate();

    let finalDepartureTime = shiftType === 'Custom' ? `${startHour}:${startMin} ${startAmPm}` : shiftType.split(' - ')[0];
    let finalReturnTime = tripType === 'round_trip' ? (shiftType === 'Custom' ? `${endHour}:${endMin} ${endAmPm}` : shiftType.split(' - ')[1]) : null;

    const { error } = await supabase.from('rides').insert([{
      driver_name: fullName,
      vehicle: profile.vehicle_details,
      outward_code: from.toUpperCase(), 
      destination_hub: to, 
      shift_type: shiftType === 'Custom' ? 'Custom' : 'Standard',
      departure_time: finalDepartureTime,
      return_time: finalReturnTime,
      trip_type: tripType,
      ride_date: rideDate,
      price: parseFloat(price),
      seats_available: parseInt(seatsAvailable),
    }]);

    setIsSubmitting(false);

    if (error) {
      setErrorMsg("Failed to post ride. Please check your connection and try again.");
    } else {
      router.push('/driver/dashboard');
    }
  };
  
  if (loadingProfile) return <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 block">
      {children} <span className="text-red-500">*</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      
      {/* COMPACT PROFESSIONAL HEADER */}
    {/* COMPACT PROFESSIONAL HEADER - FIXED ALIGNMENT */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        {/* This inner div locks the header width to match the form below it */}
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          
          {/* Clickable Logo */}
          <Link href="/" className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shrink-0 hover:opacity-80 transition-opacity">
              <Car className="h-6 w-6 text-white" />
          </Link>
          
          {/* Clickable Brand Name & Page Title */}
          <div className="flex flex-col justify-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <span className="text-lg font-black text-gray-900 tracking-tight leading-none">ShiftPool</span>
            </Link>
            <h1 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Post Your Shift</h1>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        
        {/* CUSTOM ERROR BANNER */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800">Cannot Post Ride</h3>
              <p className="text-sm text-red-600 mt-0.5">{errorMsg}</p>
            </div>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Trip Type Toggle */}
          <div className="bg-white p-1.5 rounded-xl flex gap-1 shadow-sm border border-gray-200">
            <button type="button" onClick={() => setTripType('one_way')} className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tripType === 'one_way' ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' : 'text-gray-500 hover:bg-gray-50'}`}>
              <ArrowRight className="h-4 w-4" /> One Way
            </button>
            <button type="button" onClick={() => setTripType('round_trip')} className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tripType === 'round_trip' ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' : 'text-gray-500 hover:bg-gray-50'}`}>
              <RefreshCcw className="h-4 w-4" /> Round Trip
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-5">
            {/* Route Details */}
            <div>
              <Label>Leaving From</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input required type="text" placeholder="e.g. CF14 2QR" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all uppercase font-medium" />
              </div>
            </div>

            <div>
              <Label>Going To</Label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input required type="text" placeholder="e.g. Amazon DBS2" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-medium" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-5">
            {/* DATE SELECTION WITH FIX */}
            <div>
              <Label>Date of Travel</Label>
              <div className="flex gap-2 h-11">
                <button type="button" onClick={() => setDateSelection('today')} className={`flex-1 text-xs font-bold rounded-xl border transition-all ${dateSelection === 'today' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Today</button>
                <button type="button" onClick={() => setDateSelection('tomorrow')} className={`flex-1 text-xs font-bold rounded-xl border transition-all ${dateSelection === 'tomorrow' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Tomorrow</button>
                
                {/* Fixed Custom Calendar Button */}
                <div className="relative flex-1">
                  <button type="button" onClick={openCalendar} className={`w-full h-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl border transition-all ${dateSelection === 'specific' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <CalendarDays className="h-4 w-4" />
                    {dateSelection === 'specific' && specificDate ? formatDisplayDate(specificDate) : ""}
                  </button>
                  <input 
                    ref={dateInputRef}
                    type="date" 
                    min={new Date().toISOString().split('T')[0]} 
                    value={specificDate}
                    onChange={(e) => {
                      setSpecificDate(e.target.value);
                      setDateSelection('specific');
                    }} 
                    className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none" 
                  />
                </div>
              </div>
            </div>

            {/* Shift Pills */}
            <div>
              <Label>Shift Timings</Label>
              <div className="grid grid-cols-2 gap-2">
                {predefinedShifts.map((shift) => (
                  <button key={shift} type="button" onClick={() => handleShiftSelect(shift)} className={`px-2 py-3 text-sm font-bold rounded-xl border transition-all ${shiftType === shift ? "border-emerald-600 bg-emerald-600 text-white shadow-md" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100"}`}>
                    {shift === "Custom" && shiftType === "Custom" && savedCustomString ? savedCustomString : shift}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (Per Person)</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                  <input required type="number" step="0.50" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-9 pr-3 text-gray-900 focus:border-emerald-500 outline-none font-black text-lg" />
                </div>
              </div>

              <div>
                <Label>Empty Seats</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                  <input required type="number" min="1" max="6" step="1" value={seatsAvailable} onChange={(e) => setSeatsAvailable(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-9 pr-3 text-gray-900 focus:border-emerald-500 outline-none font-black text-lg" />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70">
            {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
            {isSubmitting ? "Publishing..." : "Post Ride"}
          </button>
        </form>
      </main>

      {/* --- PROFESSIONAL CUSTOM TIME MODAL --- */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
            
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-black text-lg">Set Shift Time</h3>
              <button type="button" onClick={handleCancelCustomTime} className="text-emerald-100 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Departure Time Controls */}
              <div>
                <Label>Departure Time</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center justify-center gap-1 border border-gray-300 rounded-xl p-1 bg-gray-50">
                    <div className="relative w-full">
                      <select value={startHour} onChange={(e) => setStartHour(e.target.value)} className="w-full bg-transparent outline-none appearance-none text-center font-black text-xl py-2 cursor-pointer text-gray-900 z-10 relative">
                        {hours.map(h => <option key={`sh-${h}`} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <span className="font-black text-xl text-gray-400">:</span>
                    <div className="relative w-full">
                      <select value={startMin} onChange={(e) => setStartMin(e.target.value)} className="w-full bg-transparent outline-none appearance-none text-center font-black text-xl py-2 cursor-pointer text-gray-900 z-10 relative">
                        {minutes.map(m => <option key={`sm-${m}`} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200">
                    <button type="button" onClick={() => setStartAmPm('AM')} className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${startAmPm === 'AM' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>AM</button>
                    <button type="button" onClick={() => setStartAmPm('PM')} className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${startAmPm === 'PM' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>PM</button>
                  </div>
                </div>
              </div>

              {/* Return Time Controls (Only if Round Trip) */}
              {tripType === 'round_trip' && (
                <div className="animate-in fade-in slide-in-from-top-2 pt-4 border-t border-gray-100">
                  <Label>Return Time</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center justify-center gap-1 border border-gray-300 rounded-xl p-1 bg-gray-50">
                      <div className="relative w-full">
                        <select value={endHour} onChange={(e) => setEndHour(e.target.value)} className="w-full bg-transparent outline-none appearance-none text-center font-black text-xl py-2 cursor-pointer text-gray-900 z-10 relative">
                          {hours.map(h => <option key={`eh-${h}`} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <span className="font-black text-xl text-gray-400">:</span>
                      <div className="relative w-full">
                        <select value={endMin} onChange={(e) => setEndMin(e.target.value)} className="w-full bg-transparent outline-none appearance-none text-center font-black text-xl py-2 cursor-pointer text-gray-900 z-10 relative">
                          {minutes.map(m => <option key={`em-${m}`} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200">
                      <button type="button" onClick={() => setEndAmPm('AM')} className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${endAmPm === 'AM' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>AM</button>
                      <button type="button" onClick={() => setEndAmPm('PM')} className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${endAmPm === 'PM' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>PM</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                <button type="button" onClick={handleCancelCustomTime} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveCustomTime} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-md">
                  Confirm Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}