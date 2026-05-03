"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Car, 
  MapPin, 
  Navigation, 
  PoundSterling, 
  Users, 
  ShieldCheck, 
  Loader2, 
  ArrowRight, 
  RefreshCcw, 
  CalendarDays, 
  AlertCircle, 
  X,
  ChevronRight 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DriverNav from "@/components/DriverNav";

const predefinedShifts = [
  "6AM - 2PM",
  "8AM - 4PM",
  "6AM - 6PM",
  "2PM - 10PM",
  "10PM - 6AM",
  "Custom"
];

// Constants for the Roller
const ROLLER_HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const ROLLER_MINUTES = ["00", "15", "30", "45"]; // Professional 15-min increments
const ROLLER_AMPM = ["AM", "PM"];

export default function DriverHomePage() {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tripType, setTripType] = useState<'one_way' | 'round_trip'>('round_trip');
  const [dateSelection, setDateSelection] = useState<'today' | 'tomorrow' | 'specific'>('today');
  const [specificDate, setSpecificDate] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [price, setPrice] = useState("4.50");
  const [seatsAvailable, setSeatsAvailable] = useState("3");

  // Custom Time Modal & Roller State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [timeStep, setTimeStep] = useState<'start' | 'end'>('start');
  const [savedCustomString, setSavedCustomString] = useState("");

  const [startRoll, setStartRoll] = useState({ h: "06", m: "00", p: "AM" });
  const [endRoll, setEndRoll] = useState({ h: "02", m: "00", p: "PM" });

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/driver/login");
      
      const { data: profileData } = await supabase.from('driver_profiles').select('*').eq('id', user.id).single();
      if (profileData) setProfile(profileData);
      setLoadingProfile(false);
    }
    init();
  }, [router]);

  const handleShiftSelect = (shift: string) => {
    setErrorMsg(null);
    if (shift === "Custom") {
      setTimeStep('start');
      setIsCustomModalOpen(true);
    } else {
      setShiftType(shift);
      setSavedCustomString("");
    }
  };

  const handleConfirmCustomTime = () => {
    const formattedStart = `${startRoll.h}:${startRoll.m} ${startRoll.p}`;
    let finalString = formattedStart;

    if (tripType === 'round_trip') {
      const formattedEnd = `${endRoll.h}:${endRoll.m} ${endRoll.p}`;
      finalString = `${formattedStart} - ${formattedEnd}`;
    }

    setSavedCustomString(finalString);
    setShiftType("Custom");
    setIsCustomModalOpen(false);
  };

  const openCalendar = () => {
    if (dateInputRef.current) dateInputRef.current.showPicker();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isSubmitting) return;

    setIsSubmitting(true);
    const rideDate = dateSelection === 'today' ? new Date().toISOString().split('T')[0] : 
                     dateSelection === 'tomorrow' ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : specificDate;

 // Inside your handleSubmit function in app/driver/page.tsx

    const finalDep = shiftType === 'Custom' ? `${startRoll.h}:${startRoll.m} ${startRoll.p}` : shiftType.split(' - ')[0];
    const finalRet = tripType === 'round_trip' ? (shiftType === 'Custom' ? `${endRoll.h}:${endRoll.m} ${endRoll.p}` : shiftType.split(' - ')[1]) : null;

    // THE FIX: Updated column names to match our new database exactly
    const { error } = await supabase.from('rides').insert([{
      driver_id: profile.id,
      driver_name: `${profile.first_name} ${profile.last_name}`,
      vehicle: profile.vehicle_details,
      outward_code: from.toUpperCase(), 
      destination_hub: to, 
      shift_type: shiftType === 'Custom' ? 'Custom' : 'Standard',
      departure_time: finalDep,
      return_time: finalRet,
      trip_type: tripType,
      ride_date: rideDate,
      price: parseFloat(price),
      total_seats_capacity: parseInt(seatsAvailable), // NEW schema name
      remaining_seats: parseInt(seatsAvailable),      // NEW schema name
      status: 'active'
    }]);

    if (error) {
      console.error("Supabase Error:", error); // Added this so you can see errors in browser console
      setErrorMsg("Failed to post ride: " + error.message);
      setIsSubmitting(false);
    } else {
      router.push('/driver/dashboard');
    }
  };

  if (loadingProfile) return <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shrink-0">
              <Car className="h-6 w-6 text-white" />
          </Link>
          <div className="flex flex-col justify-center">
            <span className="text-lg font-black text-gray-900 tracking-tight leading-none">ShiftPool</span>
            <h1 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Post Your Shift</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip Type Toggle */}
          <div className="bg-white p-1.5 rounded-xl flex gap-1 shadow-sm border border-gray-200">
            <button type="button" onClick={() => setTripType('one_way')} className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tripType === 'one_way' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
              <ArrowRight className="h-4 w-4" /> One Way
            </button>
            <button type="button" onClick={() => setTripType('round_trip')} className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tripType === 'round_trip' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
              <RefreshCcw className="h-4 w-4" /> Round Trip
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1.5 block">Leaving From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input required type="text" placeholder="e.g. CF14 2QR" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 focus:border-emerald-500 outline-none uppercase font-bold" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1.5 block">Going To</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input required type="text" placeholder="e.g. Amazon DBS2" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 focus:border-emerald-500 outline-none font-bold" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1.5 block">Travel Date</label>
              <div className="flex gap-2 h-11">
                <button type="button" onClick={() => setDateSelection('today')} className={`flex-1 text-xs font-bold rounded-xl border transition-all ${dateSelection === 'today' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600'}`}>Today</button>
                <button type="button" onClick={() => setDateSelection('tomorrow')} className={`flex-1 text-xs font-bold rounded-xl border transition-all ${dateSelection === 'tomorrow' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600'}`}>Tomorrow</button>
                <button type="button" onClick={openCalendar} className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold rounded-xl border transition-all ${dateSelection === 'specific' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600'}`}>
                  <CalendarDays className="h-4 w-4" /> Calendar
                </button>
                <input ref={dateInputRef} type="date" min={new Date().toISOString().split('T')[0]} value={specificDate} onChange={(e) => { setSpecificDate(e.target.value); setDateSelection('specific'); }} className="absolute w-0 h-0 opacity-0 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1.5 block">Shift Timings</label>
              <div className="grid grid-cols-2 gap-2">
                {predefinedShifts.map((s) => (
                  <button key={s} type="button" onClick={() => handleShiftSelect(s)} className={`px-2 py-3 text-sm font-bold rounded-xl border transition-all ${shiftType === s ? "border-emerald-600 bg-emerald-600 text-white shadow-md" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                    {s === "Custom" && savedCustomString ? savedCustomString : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1.5 block">Price (£)</label>
              <input required type="number" step="0.50" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 text-center text-gray-900 focus:border-emerald-500 outline-none font-black text-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1.5 block">Seats</label>
              <input required type="number" min="1" max="6" value={seatsAvailable} onChange={(e) => setSeatsAvailable(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 text-center text-gray-900 focus:border-emerald-500 outline-none font-black text-lg" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-xl shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-70">
            {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
            {isSubmitting ? "Publishing..." : "Post Ride"}
          </button>
        </form>
      </main>

      {/* --- PREMIUM IOS-STYLE TIME MODAL --- */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-900/40 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 pb-12 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-black text-gray-900 text-xl tracking-tight">Set Shift Time</h3>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                  {tripType === 'round_trip' ? (timeStep === 'start' ? '1. Departure Time' : '2. Return Time') : 'Departure Time'}
                </p>
              </div>
              <button onClick={() => setIsCustomModalOpen(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex gap-4 justify-center items-center bg-gray-50 p-4 rounded-3xl border border-gray-100 mb-8 h-48 relative overflow-hidden mask-image-fade">
              <div className="absolute top-1/2 -translate-y-1/2 w-[80%] h-12 bg-white rounded-xl shadow-sm border border-gray-200 z-0" />
              
              {/* HOURS ROLLER */}
              <div className="h-full w-16 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10" style={{ padding: '72px 0' }}>
                {ROLLER_HOURS.map(h => {
                  const currentVal = timeStep === 'start' ? startRoll.h : endRoll.h;
                  return (
                    <div key={h} onClick={() => timeStep === 'start' ? setStartRoll({...startRoll, h}) : setEndRoll({...endRoll, h})} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${currentVal === h ? 'text-3xl font-black text-emerald-600' : 'text-xl font-bold text-gray-300'}`}>{h}</div>
                  );
                })}
              </div>
              <span className="text-2xl font-black text-gray-300 z-10">:</span>
              
              {/* MINUTES ROLLER */}
              <div className="h-full w-16 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10" style={{ padding: '72px 0' }}>
                {ROLLER_MINUTES.map(m => {
                  const currentVal = timeStep === 'start' ? startRoll.m : endRoll.m;
                  return (
                    <div key={m} onClick={() => timeStep === 'start' ? setStartRoll({...startRoll, m}) : setEndRoll({...endRoll, m})} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${currentVal === m ? 'text-3xl font-black text-emerald-600' : 'text-xl font-bold text-gray-300'}`}>{m}</div>
                  );
                })}
              </div>

              {/* AM/PM ROLLER */}
              <div className="h-full w-16 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10" style={{ padding: '72px 0' }}>
                {ROLLER_AMPM.map(p => {
                  const currentVal = timeStep === 'start' ? startRoll.p : endRoll.p;
                  return (
                    <div key={p} onClick={() => timeStep === 'start' ? setStartRoll({...startRoll, p}) : setEndRoll({...endRoll, p})} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${currentVal === p ? 'text-2xl font-black text-emerald-600' : 'text-lg font-bold text-gray-300'}`}>{p}</div>
                  );
                })}
              </div>
            </div>

            {tripType === 'round_trip' && timeStep === 'start' ? (
              <button onClick={() => setTimeStep('end')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all">
                Next: Return Time <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button onClick={handleConfirmCustomTime} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black flex items-center justify-center shadow-lg shadow-emerald-600/20 transition-all">
                Confirm Custom Timing
              </button>
            )}
          </div>
        </div>
      )}

      <DriverNav />
      
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-image-fade { -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent); mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent); }
      `}} />
    </div>
  );
}