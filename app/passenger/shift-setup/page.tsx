"use client";

import React, { useState, useEffect, useRef, UIEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar, MapPin, Briefcase, Clock, X, ChevronRight, RefreshCw, CalendarDays } from "lucide-react";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import WorkplaceAutocomplete from "@/components/WorkplaceAutocomplete"; // <-- ADD THIS

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = ["00", "15", "30", "45"];
const AMPM = ["AM", "PM"];

export default function ShiftSetupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [rotaType, setRotaType] = useState<'fixed' | 'rolling'>('fixed');
  
  // Fixed State
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Rolling State
  const [rollingOn, setRollingOn] = useState("4");
  const [rollingOff, setRollingOff] = useState("4");
  const [rollingStart, setRollingStart] = useState("");

  const [destination, setDestination] = useState("");

  // Time Roller State
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeStep, setTimeStep] = useState<'start' | 'end'>('start');
  const [customStart, setCustomStart] = useState({ h: "06", m: "00", p: "AM" });
  const [customEnd, setCustomEnd] = useState({ h: "02", m: "00", p: "PM" });

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const ampmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/passenger/signup");
      setIsLoading(false);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (showTimeModal) {
      setTimeout(() => {
        const h = timeStep === 'start' ? customStart.h : customEnd.h;
        const m = timeStep === 'start' ? customStart.m : customEnd.m;
        const p = timeStep === 'start' ? customStart.p : customEnd.p;
        if (hourRef.current) hourRef.current.scrollTop = HOURS.indexOf(h) * 48;
        if (minuteRef.current) minuteRef.current.scrollTop = MINUTES.indexOf(m) * 48;
        if (ampmRef.current) ampmRef.current.scrollTop = AMPM.indexOf(p) * 48;
      }, 10);
    }
  }, [showTimeModal, timeStep]); 

  const handleRollerScroll = (e: UIEvent<HTMLDivElement>, type: 'h' | 'm' | 'p') => {
    const index = Math.round(e.currentTarget.scrollTop / 48);
    if (type === 'h' && HOURS[index]) timeStep === 'start' ? setCustomStart(prev => ({...prev, h: HOURS[index]})) : setCustomEnd(prev => ({...prev, h: HOURS[index]}));
    if (type === 'm' && MINUTES[index]) timeStep === 'start' ? setCustomStart(prev => ({...prev, m: MINUTES[index]})) : setCustomEnd(prev => ({...prev, m: MINUTES[index]}));
    if (type === 'p' && AMPM[index]) timeStep === 'start' ? setCustomStart(prev => ({...prev, p: AMPM[index]})) : setCustomEnd(prev => ({...prev, p: AMPM[index]}));
  };

  const handleScrollTo = (ref: React.RefObject<HTMLDivElement | null>, index: number) => {
    if (ref.current) ref.current.scrollTo({ top: index * 48, behavior: 'smooth' });
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const formattedShiftTime = `${customStart.h}:${customStart.m} ${customStart.p} - ${customEnd.h}:${customEnd.m} ${customEnd.p}`;

  const handleSaveRota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rotaType === 'fixed' && selectedDays.length === 0) return setErrorMsg("Select at least one day.");
    if (rotaType === 'rolling' && (!rollingOn || !rollingOff || !rollingStart)) return setErrorMsg("Complete all rolling pattern fields.");
    if (!destination) return setErrorMsg("Please enter a destination hub.");

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication error.");

      // Upsert: Because id is uniquely tied to passenger_id, we can safely overwrite it.
      const { error } = await supabase.from('passenger_shifts').upsert({
        passenger_id: user.id,
        rota_type: rotaType,
        fixed_days: rotaType === 'fixed' ? selectedDays : [],
        rolling_on: rotaType === 'rolling' ? parseInt(rollingOn) : 0,
        rolling_off: rotaType === 'rolling' ? parseInt(rollingOff) : 0,
        rolling_start_date: rotaType === 'rolling' ? rollingStart : null,
        shift_time: formattedShiftTime,
        destination_hub: destination
      }, { onConflict: 'passenger_id' });

      if (error) throw error;
      router.push("/passenger/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save shift rota.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "w-full rounded-xl border border-gray-300 bg-gray-50 py-3.5 pl-11 pr-4 text-sm text-gray-900 font-bold focus:border-emerald-500 outline-none";

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      <header className="bg-white px-4 py-4 border-b border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Shift Rota</h1>
        </div>
        <button onClick={() => router.push("/passenger/dashboard")} className="text-sm font-bold text-gray-400 hover:text-gray-600">
          Skip for now
        </button>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-5 py-8 animate-in fade-in">
        <div className="mb-6 text-center">
          <div className="h-16 w-16 bg-emerald-100 rounded-[2rem] flex items-center justify-center mx-auto mb-4 rotate-3">
             <Calendar className="h-8 w-8 text-emerald-600 -rotate-3" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Regular Commute?</h2>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl">
            <p className="text-sm font-bold text-red-700 leading-snug">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSaveRota} className="space-y-6">
          
          {/* Pattern Toggle */}
          <div className="flex bg-gray-200/80 p-1 rounded-xl">
            <button type="button" onClick={() => setRotaType('fixed')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-black rounded-lg transition-all ${rotaType === 'fixed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>
              <CalendarDays className="h-4 w-4" /> Fixed Weekly
            </button>
            <button type="button" onClick={() => setRotaType('rolling')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-black rounded-lg transition-all ${rotaType === 'rolling' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>
              <RefreshCw className="h-4 w-4" /> Rolling Rota
            </button>
          </div>

          {rotaType === 'fixed' ? (
            <div className="animate-in fade-in">
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <button key={day} type="button" onClick={() => toggleDay(day)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${selectedDays.includes(day) ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-emerald-50'}`}>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="bg-white border border-gray-300 rounded-xl p-3 flex justify-between items-center cursor-pointer" onClick={() => setShowTimeModal(true)}>
              <div className="flex items-center gap-3 pl-1">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Shift Time</p>
                    <p className="font-black text-sm text-gray-900">{formattedShiftTime}</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg">Edit</span>
            </div>

            {/* --- REPLACED DESTINATION INPUT --- */}
            <div className="space-y-1.5 relative z-20">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1">Workplace Hub</label>
              <WorkplaceAutocomplete 
                value={destination} 
                onChange={setDestination} 
                placeholder="Search workplaces (e.g. GXO Bristol)..." 
                icon="briefcase"
              />
            </div>
          </div>
          )}

          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="bg-white border border-gray-300 rounded-xl p-3 flex justify-between items-center cursor-pointer" onClick={() => setShowTimeModal(true)}>
              <div className="flex items-center gap-3 pl-1">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Shift Time</p>
                    <p className="font-black text-sm text-gray-900">{formattedShiftTime}</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg">Edit</span>
            </div>

            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input required type="text" placeholder="Workplace Hub (e.g. GXO Bristol)" value={destination} onChange={(e) => setDestination(e.target.value)} className={inputClassName} />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full mt-8 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-base font-black text-white active:scale-[0.98] disabled:opacity-70 shadow-xl">
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Shift Pattern"}
          </button>
        </form>
      </main>

      {/* KEEP TIME ROLLER MODAL EXACTLY THE SAME AS PREVIOUS CODE */}
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

            <div className="flex gap-4 justify-center items-center bg-gray-50 p-4 rounded-3xl border border-gray-100 mb-6 h-48 relative overflow-hidden mask-image-fade shadow-inner">
              <div className="absolute top-1/2 -translate-y-1/2 w-[80%] h-12 bg-white rounded-xl shadow-sm border border-gray-200 pointer-events-none z-0" />
              
              <div ref={hourRef} onScroll={(e) => handleRollerScroll(e as any, 'h')} className="h-full w-20 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10 scroll-smooth relative" style={{ padding: '72px 0' }}>
                {HOURS.map((h, i) => {
                  const isSelected = (timeStep === 'start' ? customStart.h : customEnd.h) === h;
                  return <div key={`h-${h}`} onClick={() => handleScrollTo(hourRef, i)} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'text-3xl font-black text-emerald-600' : 'text-xl font-bold text-gray-400 hover:text-gray-600'}`}>{h}</div>
                })}
              </div>
              <span className="text-2xl font-black text-gray-300 pb-1 z-10">:</span>
              
              <div ref={minuteRef} onScroll={(e) => handleRollerScroll(e as any, 'm')} className="h-full w-20 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10 scroll-smooth relative" style={{ padding: '72px 0' }}>
                {MINUTES.map((m, i) => {
                  const isSelected = (timeStep === 'start' ? customStart.m : customEnd.m) === m;
                  return <div key={`m-${m}`} onClick={() => handleScrollTo(minuteRef, i)} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'text-3xl font-black text-emerald-600' : 'text-xl font-bold text-gray-400 hover:text-gray-600'}`}>{m}</div>
                })}
              </div>

              <div ref={ampmRef} onScroll={(e) => handleRollerScroll(e as any, 'p')} className="h-full w-20 overflow-y-auto snap-y snap-mandatory scrollbar-hide z-10 scroll-smooth relative" style={{ padding: '72px 0' }}>
                {AMPM.map((p, i) => {
                  const isSelected = (timeStep === 'start' ? customStart.p : customEnd.p) === p;
                  return <div key={`p-${p}`} onClick={() => handleScrollTo(ampmRef, i)} className={`h-12 snap-center flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'text-2xl font-black text-emerald-600' : 'text-lg font-bold text-gray-400 hover:text-gray-600'}`}>{p}</div>
                })}
              </div>
            </div>

            {timeStep === 'start' ? (
              <button type="button" onClick={() => setTimeStep('end')} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all">
                Next: End Time <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button type="button" onClick={() => { setShowTimeModal(false); setTimeStep('start'); }} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all">
                Confirm Custom Shift
              </button>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-image-fade { -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent); mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent); }
      `}} />

      <PassengerBottomNav />
    </div>
  );
}