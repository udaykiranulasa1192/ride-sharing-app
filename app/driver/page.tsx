"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WorkplaceAutocomplete from "@/components/WorkplaceAutocomplete";
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
  ChevronRight,
  LayoutDashboard
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DriverNav from "@/components/DriverNav";
import PassengerAuthForm from "@/components/PassengerAuthForm";

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
const ROLLER_MINUTES = ["00", "15", "30", "45"]; 
const ROLLER_AMPM = ["AM", "PM"];

export default function DriverHomePage() {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  
  // THE FIX: State uses 'two_way' to satisfy the DB constraint
  const [tripType, setTripType] = useState<'one_way' | 'two_way'>('two_way');
  
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
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    setLoadingProfile(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      setIsLoggedIn(false);
      setLoadingProfile(false);
      return;
    }

    setIsLoggedIn(true);
    const { data: profileData } = await supabase.from('driver_profiles').select('*').eq('id', user.id).single();
    if (profileData) setProfile(profileData);
    setLoadingProfile(false);
  }

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

    // THE FIX: Check for 'two_way' instead of 'round_trip'
    if (tripType === 'two_way') {
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

    if (!from || !to) {
      setErrorMsg("Please select both a pickup location and destination.");
      return;
    }

    if (!shiftType) {
      setErrorMsg("Please select your shift timings.");
      return;
    }

    setIsSubmitting(true);
    const rideDate = dateSelection === 'today' ? new Date().toISOString().split('T')[0] : 
                     dateSelection === 'tomorrow' ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : specificDate;

    const finalDep = shiftType === 'Custom' ? `${startRoll.h}:${startRoll.m} ${startRoll.p}` : shiftType.split(' - ')[0];
    const finalRet = tripType === 'two_way' ? (shiftType === 'Custom' ? `${endRoll.h}:${endRoll.m} ${endRoll.p}` : shiftType.split(' - ')[1]) : null;

    // THE FIX: Automatically extract the Outward Code (e.g. CF10) from the 'from' autocomplete string
    const extractedOutwardCode = from.trim().split(' ')[0].toUpperCase().substring(0, 4);

    const { error } = await supabase.from('rides').insert([{
      driver_id: profile.id,
      driver_name: `${profile.first_name} ${profile.last_name}`,
      vehicle: profile.vehicle_details || 'Standard Car',
      outward_code: extractedOutwardCode, 
      destination_hub: to, 
      shift_type: shiftType === 'Custom' ? savedCustomString : shiftType,
      departure_time: finalDep,
      return_time: finalRet,
      trip_type: tripType, // Now safely sends 'two_way' or 'one_way'
      ride_date: rideDate,
      price: parseFloat(price),
      total_seats_capacity: parseInt(seatsAvailable), 
      remaining_seats: parseInt(seatsAvailable),      
      status: 'active'
    }]);

    if (error) {
      console.error("Supabase Error:", error); 
      if (error.code === '23505') {
        setErrorMsg("You already have an active ride posted for this date and shift!");
      } else {
        setErrorMsg("Failed to post ride: " + error.message);
      }
      setIsSubmitting(false);
    } else {
      router.push('/driver/dashboard');
    }
  };

  if (loadingProfile) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-50 p-4 pb-32">
      <div className="max-w-md mx-auto pt-16 text-center">
        <div className="h-16 w-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <LayoutDashboard className="h-8 w-8 text-gray-900" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Publish a Route</h2>
        <p className="text-gray-500 text-sm mb-10">Sign in to offer empty seats and earn money.</p>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <PassengerAuthForm onSuccess={checkUser} />
        </div>
      </div>
      <DriverNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      
      {/* Sleek Error Toast */}
      {errorMsg && (
        <div className="fixed top-4 left-0 right-0 z-[200] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-gray-900 text-white rounded-xl p-3 shadow-xl flex items-center gap-3 w-full max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="flex-1 text-sm font-semibold">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-gray-400 hover:text-white p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/driver/dashboard" className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm shrink-0">
                <Car className="h-5 w-5 text-white" />
            </Link>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 tracking-tight leading-none">ShiftPool</span>
              <h1 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Post Your Shift</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 animate-in fade-in slide-in-from-bottom-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Trip Type Toggle */}
          <div className="bg-white p-1 rounded-xl flex gap-1 shadow-sm border border-gray-200">
            <button type="button" onClick={() => setTripType('one_way')} className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tripType === 'one_way' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
              <ArrowRight className="h-4 w-4" /> One Way
            </button>
            <button type="button" onClick={() => setTripType('two_way')} className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tripType === 'two_way' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
              <RefreshCcw className="h-4 w-4" /> Round Trip
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-6">
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block pl-1">Leaving From</label>
              <WorkplaceAutocomplete 
                value={from} 
                onChange={setFrom} 
                placeholder="Postcode or Area..." 
                icon="map-pin"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block pl-1">Going To</label>
              <WorkplaceAutocomplete 
                value={to} 
                onChange={setTo} 
                placeholder="Search workplaces..." 
                icon="navigation"
              />
            </div>
            
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-5">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block pl-1">Travel Date</label>
              <div className="flex gap-2 h-11">
                <button type="button" onClick={() => setDateSelection('today')} className={`flex-1 text-xs font-bold rounded-xl border transition-all ${dateSelection === 'today' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Today</button>
                <button type="button" onClick={() => setDateSelection('tomorrow')} className={`flex-1 text-xs font-bold rounded-xl border transition-all ${dateSelection === 'tomorrow' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Tomorrow</button>
                <button type="button" onClick={openCalendar} className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold rounded-xl border transition-all ${dateSelection === 'specific' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <CalendarDays className="h-4 w-4" /> Calendar
                </button>
                <input ref={dateInputRef} type="date" min={new Date().toISOString().split('T')[0]} value={specificDate} onChange={(e) => { setSpecificDate(e.target.value); setDateSelection('specific'); }} className="absolute w-0 h-0 opacity-0 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block pl-1">Shift Timings</label>
              <div className="grid grid-cols-2 gap-2">
                {predefinedShifts.map((s) => (
                  <button key={s} type="button" onClick={() => handleShiftSelect(s)} className={`px-2 py-3 text-sm font-bold rounded-xl border transition-all ${shiftType === s ? "border-emerald-600 bg-emerald-600 text-white shadow-md" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>
                    {s === "Custom" && savedCustomString ? savedCustomString : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block pl-1 flex items-center gap-1.5"><PoundSterling className="h-3 w-3"/> Price per seat</label>
              <input required type="number" step="0.50" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-center text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-lg transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block pl-1 flex items-center gap-1.5"><Users className="h-3 w-3"/> Empty Seats</label>
              <input required type="number" min="1" max="6" value={seatsAvailable} onChange={(e) => setSeatsAvailable(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-center text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-lg transition-all" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 text-sm font-bold text-white shadow-md hover:bg-gray-800 active:scale-[0.98] disabled:opacity-70 transition-all mt-4">
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            {isSubmitting ? "Publishing..." : "Publish Route"}
          </button>
      
        </form>
      </main>

      {/* --- THE FIX: CENTERED IOS-STYLE TIME MODAL --- */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-gray-900 text-xl tracking-tight">Set Shift Time</h3>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                  {tripType === 'two_way' ? (timeStep === 'start' ? '1. Departure Time' : '2. Return Time') : 'Departure Time'}
                </p>
              </div>
              <button onClick={() => setIsCustomModalOpen(false)} className="h-10 w-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
            </div>

            <div className="flex gap-4 justify-center items-center bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-6 h-48 relative overflow-hidden mask-image-fade shadow-inner">
              <div className="absolute top-1/2 -translate-y-1/2 w-[80%] h-12 bg-white rounded-xl shadow-sm border border-gray-200 z-0" />
              
              {/* HOURS ROLLER */}
              <div className="h-full w-16 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10" style={{ padding: '72px 0' }}>
                {ROLLER_HOURS.map(h => {
                  const currentVal = timeStep === 'start' ? startRoll.h : endRoll.h;
                  return (
                    <div key={h} onClick={() => timeStep === 'start' ? setStartRoll({...startRoll, h}) : setEndRoll({...endRoll, h})} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${currentVal === h ? 'text-3xl font-bold text-emerald-600' : 'text-xl font-semibold text-gray-300'}`}>{h}</div>
                  );
                })}
              </div>
              <span className="text-2xl font-bold text-gray-300 z-10">:</span>
              
              {/* MINUTES ROLLER */}
              <div className="h-full w-16 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10" style={{ padding: '72px 0' }}>
                {ROLLER_MINUTES.map(m => {
                  const currentVal = timeStep === 'start' ? startRoll.m : endRoll.m;
                  return (
                    <div key={m} onClick={() => timeStep === 'start' ? setStartRoll({...startRoll, m}) : setEndRoll({...endRoll, m})} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${currentVal === m ? 'text-3xl font-bold text-emerald-600' : 'text-xl font-semibold text-gray-300'}`}>{m}</div>
                  );
                })}
              </div>

              {/* AM/PM ROLLER */}
              <div className="h-full w-16 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10" style={{ padding: '72px 0' }}>
                {ROLLER_AMPM.map(p => {
                  const currentVal = timeStep === 'start' ? startRoll.p : endRoll.p;
                  return (
                    <div key={p} onClick={() => timeStep === 'start' ? setStartRoll({...startRoll, p}) : setEndRoll({...endRoll, p})} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${currentVal === p ? 'text-2xl font-bold text-emerald-600' : 'text-lg font-semibold text-gray-300'}`}>{p}</div>
                  );
                })}
              </div>
            </div>

            {tripType === 'two_way' && timeStep === 'start' ? (
              <button onClick={() => setTimeStep('end')} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 shadow-md transition-all">
                Next: Return Time <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleConfirmCustomTime} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center shadow-md hover:bg-gray-800 transition-all">
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