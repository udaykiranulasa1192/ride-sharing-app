"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Car, 
  Calendar, 
  Users, 
  Loader2, 
  ArrowLeft,
  X,
  ChevronRight,
  Plus,
  Minus
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DriverNav from "@/components/DriverNav";

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

export default function PostRidePage() {
  const router = useRouter();
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // --- FORM STATE ---
  const [loading, setLoading] = React.useState(false);
  const [fromPostcode, setFromPostcode] = React.useState("");
  const [destinationHub, setDestinationHub] = React.useState("");
  const [tripType, setTripType] = React.useState<'round_trip' | 'one_way'>('round_trip');
  const [dateSelection, setDateSelection] = React.useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = React.useState("");
  const [shift, setShift] = React.useState("6AM - 2PM");
  const [seats, setSeats] = React.useState(4);

  // Custom Time Modal State
  const [showTimeModal, setShowTimeModal] = React.useState(false);
  const [timeStep, setTimeStep] = React.useState<'start' | 'end'>('start');
  const [customStart, setCustomStart] = React.useState({ h: "06", m: "00", p: "AM" });
  const [customEnd, setCustomEnd] = React.useState({ h: "02", m: "00", p: "PM" });

  // --- HANDLERS ---
  const formatPostcode = (value: string) => {
    let val = value.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
    if (val.length > 7) val = val.slice(0, 7); 
    if (val.length > 3) {
      val = val.slice(0, val.length - 3) + ' ' + val.slice(val.length - 3);
    }
    return val;
  };

  const handlePostRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/driver/login");

    let finalDate = customDate;
    if (dateSelection === 'today') finalDate = new Date().toISOString().split('T')[0];
    if (dateSelection === 'tomorrow') {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      finalDate = tmrw.toISOString().split('T')[0];
    }

    const departureTime = shift === "Custom" ? `${customStart.h}:${customStart.m} ${customStart.p}` : shift.split(" - ")[0];

    const { error } = await supabase.from('rides').insert([{
      driver_id: user.id,
      driver_name: user.user_metadata.first_name,
      start_postcode: fromPostcode,
      destination_hub: destinationHub,
      ride_date: finalDate,
      departure_time: departureTime,
      trip_type: tripType,
      total_seats: seats,
      remaining_seats: seats,
      status: 'active',
      vehicle: user.user_metadata.car_model || "Vehicle"
    }]);

    if (error) {
      alert("Failed to post ride: " + error.message);
    } else {
      router.push("/driver/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500">
                <ArrowLeft className="h-5 w-5" />
             </button>
             <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">Post a Shift</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* LOGO AREA */}
        <div className="text-center py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg mx-auto mb-3">
            <Car className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-bold text-gray-400">List your vehicle for the next shift</p>
        </div>

        <form onSubmit={handlePostRide} className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          
          {/* 1. ROUTE */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Starting From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="text" placeholder="Your Postcode (e.g. CF14)" value={fromPostcode} onChange={(e) => setFromPostcode(formatPostcode(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 font-bold focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Heading To</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="text" placeholder="Workplace / Hub" value={destinationHub} onChange={(e) => setDestinationHub(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-gray-900 font-bold focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />

          {/* 2. DATE SELECTION (Same as Passenger) */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Travel Date</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDateSelection('today')} className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${dateSelection === 'today' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200'}`}>Today</button>
              <button type="button" onClick={() => setDateSelection('tomorrow')} className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${dateSelection === 'tomorrow' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200'}`}>Tomorrow</button>
            </div>
            <div className="relative w-full">
              <button type="button" onClick={() => dateInputRef.current?.showPicker()} className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm border-2 transition-all ${dateSelection === 'custom' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200'}`}>
                <Calendar className="h-5 w-5" />
                <span>{dateSelection === 'custom' && customDate ? new Date(customDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }) : 'Choose from calendar'}</span>
              </button>
              <input ref={dateInputRef} type="date" min={new Date().toISOString().split('T')[0]} value={customDate} onChange={(e) => { if (e.target.value) { setCustomDate(e.target.value); setDateSelection('custom'); } }} className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" />
            </div>
          </div>

          {/* 3. TRIP TYPE */}
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Trip Type</label>
             <div className="flex rounded-xl bg-gray-100 p-1">
               <button type="button" onClick={() => setTripType('round_trip')} className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all ${tripType === 'round_trip' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}>Round Trip</button>
               <button type="button" onClick={() => setTripType('one_way')} className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all ${tripType === 'one_way' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}>One Way</button>
             </div>
          </div>

          {/* 4. SHIFT (Mini Buttons) */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Shift Timing</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SHIFTS.map((s) => (
                <button key={s} type="button" onClick={() => { setShift(s); if (s === "Custom") setShowTimeModal(true); }} className={`px-3 py-2 rounded-xl text-xs font-black border-2 transition-all ${shift === s ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "border-gray-100 bg-white text-gray-500 hover:border-emerald-200"}`}>{s}</button>
              ))}
            </div>
          </div>

          {/* 5. CAPACITY */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Available Seats</label>
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-200">
               <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))} className="h-10 w-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 shadow-sm"><Minus className="h-5 w-5" /></button>
               <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-emerald-600" />
                  <span className="text-2xl font-black text-gray-900">{seats}</span>
               </div>
               <button type="button" onClick={() => setSeats(Math.min(6, seats + 1))} className="h-10 w-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 shadow-sm"><Plus className="h-5 w-5" /></button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50">
            {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "Post Ride Now"}
          </button>
        </form>
      </main>

      {/* --- TIME MODAL (Same logic as Search) --- */}
      {showTimeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 backdrop-blur-sm sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[32px] p-8 pb-12 sm:pb-8 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-gray-900 text-xl">Custom Time</h3>
              <button onClick={() => setShowTimeModal(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="flex gap-4 justify-center items-center bg-gray-50 p-6 rounded-[32px] border border-gray-100 mb-8 h-48 relative overflow-hidden">
               {/* Simplified scroll logic for brevity - use the same scroller as search */}
               <div className="text-3xl font-black text-emerald-600">
                  {timeStep === 'start' ? `${customStart.h}:${customStart.m} ${customStart.p}` : `${customEnd.h}:${customEnd.m} ${customEnd.p}`}
               </div>
            </div>

            {tripType === 'round_trip' && timeStep === 'start' ? (
              <button onClick={() => setTimeStep('end')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">Next: End Time <ChevronRight className="h-5 w-5" /></button>
            ) : (
              <button onClick={() => { setShowTimeModal(false); setTimeStep('start'); }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black">Confirm Timing</button>
            )}
          </div>
        </div>
      )}

      <DriverNav />
    </div>
  );
}