"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Car, 
  MessageCircle, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle,
  Calendar,
  User,
  Navigation,
  X,
  CheckCircle2,
  Radio,
  Clock,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import PassengerBottomNav from "@/components/PassengerBottomNav";
import PassengerAuthForm from "@/components/PassengerAuthForm";
import Link from "next/link";

export default function PassengerDashboard() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const [confirmedTrips, setConfirmedTrips] = useState<any[]>([]);
  const [pendingBroadcasts, setPendingBroadcasts] = useState<any[]>([]);
  const [pendingSeatRequests, setPendingSeatRequests] = useState<any[]>([]);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [matchToCancel, setMatchToCancel] = useState<any | null>(null);
  const [cancelType, setCancelType] = useState<'broadcast' | 'request' | 'confirmed' | null>(null);

  // --- NEW CALENDAR STATES ---
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [shiftRota, setShiftRota] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);

    const today = new Date().toISOString().split('T')[0];

    const { data: matchesData } = await supabase
      .from('trip_matches')
      .select(`*, rides!inner(*)`)
      .eq('passenger_id', user.id)
      .in('match_status', ['pending', 'confirmed'])
      .gte('rides.ride_date', today) 
      .order('created_at', { ascending: false });

    const { data: broadcasts } = await supabase
      .from('open_requests')
      .select('*')
      .eq('passenger_id', user.id)
      .gte('ride_date', today) 
      .order('ride_date', { ascending: true });

    const driverIds = new Set<string>();
    matchesData?.forEach((m: any) => { if (m.rides?.driver_id) driverIds.add(m.rides.driver_id); });

    const driverPhones: Record<string, string> = {};
    if (driverIds.size > 0) {
      const { data: profiles } = await supabase
        .from('driver_profiles')
        .select('id, mobile_number')
        .in('id', Array.from(driverIds));
      profiles?.forEach(p => { driverPhones[p.id] = p.mobile_number; });
    }

    const enrichedMatches = matchesData?.map((m: any) => ({
      ...m,
      driver_phone: driverPhones[m.rides?.driver_id] || ""
    })) || [];

    setConfirmedTrips(enrichedMatches.filter(m => m.match_status === 'confirmed'));
    setPendingSeatRequests(enrichedMatches.filter(m => m.match_status === 'pending'));
    setPendingBroadcasts(broadcasts || []);

    // --- NEW FETCH FOR SHIFT ROTA ---
    const { data: shifts } = await supabase
      .from('passenger_shifts')
      .select('*')
      .eq('passenger_id', user.id);
    setShiftRota(shifts || []);

    setLoading(false);
  }

  const triggerCancelWarning = (item: any, type: 'broadcast' | 'request' | 'confirmed') => {
    setMatchToCancel(item);
    setCancelType(type);
    setCancelModalOpen(true);
  };

  const executeCancel = async () => {
    if (!matchToCancel || !cancelType) return;
    setCancelingId(matchToCancel.id);
    
    if (cancelType === 'broadcast') {
      await supabase.from('open_requests').delete().eq('id', matchToCancel.id);
    } else if (cancelType === 'request') {
      await supabase.from('trip_matches').delete().eq('id', matchToCancel.id);
    } else if (cancelType === 'confirmed') {
      const { data: rideData } = await supabase.from('rides').select('remaining_seats').eq('id', matchToCancel.ride_id).single();
      if (rideData) {
        const refundedSeats = rideData.remaining_seats + matchToCancel.seats_needed;
        await supabase.from('rides').update({ remaining_seats: refundedSeats }).eq('id', matchToCancel.ride_id);
      }
      await supabase.from('trip_matches').update({ match_status: 'cancelled' }).eq('id', matchToCancel.id);
    }

    await fetchDashboardData();
    setCancelingId(null);
    setCancelModalOpen(false);
    setMatchToCancel(null);
    setCancelType(null);
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  // --- CALENDAR LOGIC ---
  const getFormattedDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

// --- CALENDAR LOGIC WITH ROLLING SUPPORT ---
  const generateCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; 

    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    const rotaConfig = shiftRota.length > 0 ? shiftRota[0] : null;

    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const dateStr = getFormattedDate(dateObj);
      const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
      
      const isSelected = dateStr === selectedCalendarDate;
      
      // Calculate if this specific day is a work shift based on their pattern
      let hasShiftRota = false;
      if (rotaConfig) {
        if (rotaConfig.rota_type === 'fixed') {
          hasShiftRota = rotaConfig.fixed_days.includes(dayName);
        } else if (rotaConfig.rota_type === 'rolling' && rotaConfig.rolling_start_date) {
          const startDate = new Date(rotaConfig.rolling_start_date);
          const diffTime = dateObj.getTime() - startDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 0) {
            const cycleLength = rotaConfig.rolling_on + rotaConfig.rolling_off;
            const dayInCycle = diffDays % cycleLength;
            hasShiftRota = dayInCycle < rotaConfig.rolling_on;
          }
        }
      }
      
      const hasConfirmed = confirmedTrips.some(t => t.rides?.ride_date === dateStr);
      const hasPending = pendingSeatRequests.some(t => t.rides?.ride_date === dateStr) || pendingBroadcasts.some(b => b.ride_date === dateStr);
      
      // FIXED TEXT COLOR BUG HERE:
      let boxClass = 'bg-white text-gray-900 border-gray-100 hover:border-gray-300';
      if (hasConfirmed) boxClass = 'bg-emerald-500 text-white border-emerald-600 font-black shadow-md';
      else if (hasPending) boxClass = 'bg-orange-500 text-white border-orange-600 font-black shadow-md';
      else if (isSelected) boxClass = 'border-gray-900 border-2 font-black text-gray-900 bg-white'; // The selected day fix

      days.push(
        <div key={dateStr} className="flex flex-col items-center justify-start gap-1 h-14">
          <button
            onClick={() => setSelectedCalendarDate(dateStr)}
            className={`h-10 w-10 flex items-center justify-center rounded-xl text-sm border transition-all ${boxClass}`}
          >
            {i}
          </button>
          {hasShiftRota && !hasConfirmed && !hasPending && (
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-400"></div>
          )}
        </div>
      );
    }
    return days;
  };

  // Re-calculate the selected day details to use the new logic
  const checkSelectedDayHasShift = () => {
    if (shiftRota.length === 0) return false;
    const config = shiftRota[0];
    const dateObj = new Date(selectedCalendarDate);
    const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });

    if (config.rota_type === 'fixed') return config.fixed_days.includes(dayName);
    if (config.rota_type === 'rolling' && config.rolling_start_date) {
      const startDate = new Date(config.rolling_start_date);
      const diffDays = Math.floor((dateObj.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return false;
      return (diffDays % (config.rolling_on + config.rolling_off)) < config.rolling_on;
    }
    return false;
  };

  const selectedDayRota = checkSelectedDayHasShift() ? shiftRota[0] : null;
  const selectedDayTrips = confirmedTrips.filter(t => t.rides?.ride_date === selectedCalendarDate);
  const selectedDayPending = [...pendingSeatRequests.filter(t => t.rides?.ride_date === selectedCalendarDate), ...pendingBroadcasts.filter(b => b.ride_date === selectedCalendarDate)];
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing Trips</p>
      </div>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-md mx-auto pt-20 px-6 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="h-24 w-24 bg-white border-2 border-emerald-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-600/10 rotate-3">
            <Car className="h-12 w-12 text-emerald-600 -rotate-3" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Your Rides</h2>
        <p className="text-gray-500 text-sm font-medium mb-10 leading-relaxed">Sign in to manage your upcoming commutes, driver chats, and shift schedules.</p>
        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
          <PassengerAuthForm onSuccess={fetchDashboardData} />
        </div>
      </div>
      <PassengerBottomNav />
    </div>
  );

  const hasPending = pendingBroadcasts.length > 0 || pendingSeatRequests.length > 0;
  const hasConfirmed = confirmedTrips.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Your Active Commutes</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/passenger/shift-setup" className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-100 hover:bg-emerald-100 transition-colors">
              <Calendar className="h-3.5 w-3.5" /> Rota
            </Link>
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
               <User className="h-5 w-5" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-8 animate-in fade-in">

        {/* VIEW TOGGLE */}
        <div className="flex bg-gray-200/80 p-1 rounded-xl mb-4">
          <button 
            onClick={() => setViewMode('calendar')} 
            className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Calendar
          </button>
          <button 
            onClick={() => setViewMode('list')} 
            className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            List View
          </button>
        </div>

        {/* --- LIST VIEW --- */}
        {viewMode === 'list' && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            
            {hasConfirmed && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 pl-2">
                   <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                   <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Confirmed Trips</h2>
                </div>

                {confirmedTrips.map((ride) => {
                  const phoneStr = ride.driver_phone?.replace('+', '') || "";
                  const waLink = `https://wa.me/${phoneStr}?text=Hi! I am confirmed for the ${ride.rides.departure_time} shift.`;

                  return (
                    <div key={ride.id} className="bg-gray-900 rounded-[32px] shadow-2xl shadow-gray-900/20 overflow-hidden relative group">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 opacity-90"></div>
                      
                      <div className="p-6 pb-5 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 bg-gray-800 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-inner border border-gray-700">
                            {ride.rides.driver_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="font-black text-white text-xl leading-none">{ride.rides.driver_name}</p>
                              <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                              <Car className="h-3 w-3" /> {ride.rides.vehicle}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Your Fare</p>
                          <p className="font-black text-2xl text-emerald-400 leading-none">£{Number(ride.rides.price).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="px-6 pb-6">
                        <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50 relative overflow-hidden">
                          <div className="flex justify-between items-center mb-5 border-b border-gray-700/50 pb-4">
                            <div>
                               <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Date</p>
                               <p className="text-sm font-bold text-white flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-emerald-400"/> {formatShortDate(ride.rides.ride_date)}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Shift Start</p>
                               <p className="text-sm font-bold text-white flex items-center gap-1.5 justify-end"><Clock className="h-3.5 w-3.5 text-emerald-400"/> {ride.rides.departure_time}</p>
                            </div>
                          </div>

                          <div className="relative pl-6 space-y-4">
                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-700 rounded-full"></div>
                            <div className="relative">
                              <div className="absolute -left-6 top-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-gray-800 shadow-sm"></div>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Pickup ({ride.seats_needed} Seats)</p>
                              <span className="text-base font-bold text-white leading-tight">{ride.pickup_postcode.split(' ')[0]}</span> 
                            </div>
                            <div className="relative pt-1">
                              <div className="absolute -left-6 top-2 h-3 w-3 bg-white rounded-sm border-2 border-gray-800 shadow-sm"></div>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Destination</p>
                              <span className="text-base font-black text-white leading-tight">{ride.rides.destination_hub}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 pb-6 flex gap-3">
                        <a href={waLink} target="_blank" rel="noreferrer" className="flex-[2] bg-emerald-500 text-gray-900 py-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95">
                          <MessageCircle className="h-5 w-5" /> Chat Driver
                        </a>
                        <button onClick={() => triggerCancelWarning(ride, 'confirmed')} className="flex-1 bg-gray-800 text-gray-300 py-4 rounded-xl text-sm font-bold flex items-center justify-center hover:bg-gray-700 hover:text-white transition-colors active:scale-95">
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {hasPending && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 pl-2 mt-4">
                   <Radio className="h-4 w-4 text-orange-500" />
                   <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Live Requests</h2>
                </div>

                {pendingBroadcasts.map((req) => (
                  <div key={req.id} className="bg-white rounded-[24px] border-2 border-emerald-400 p-1 shadow-lg shadow-emerald-600/10 overflow-hidden relative">
                    <div className="absolute -right-6 -top-6 opacity-5 pointer-events-none">
                      <Radio className="h-40 w-40 text-emerald-600 animate-pulse" />
                    </div>
                    
                    <div className="bg-white rounded-[20px] p-5 relative z-10">
                      <div className="flex justify-between items-center mb-5">
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Broadcasting
                          </p>
                          <h4 className="font-black text-gray-900 text-xl tracking-tight">Searching Network</h4>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Offer</p>
                           <p className="font-black text-2xl text-emerald-600 leading-none">£{Number(req.calculated_price).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200/50">
                           <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-gray-400"/> {formatShortDate(req.ride_date)}</span>
                           <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-400"/> {req.shift_type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">From</p>
                            <p className="font-bold text-gray-900 text-sm truncate">{req.pickup_postcode.split(' ')[0]}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                          <div className="flex-1 text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">To</p>
                            <p className="font-bold text-gray-900 text-sm truncate">{req.destination_hub}</p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => triggerCancelWarning(req, 'broadcast')} 
                        className="w-full py-3.5 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex justify-center items-center gap-2 border border-transparent hover:border-red-100"
                      >
                        Revoke Request
                      </button>
                    </div>
                  </div>
                ))}

                {pendingSeatRequests.map((match) => (
                  <div key={match.id} className="bg-white rounded-[24px] border border-gray-200 p-1 shadow-sm overflow-hidden relative">
                    <div className="bg-white rounded-[20px] p-5 relative z-10">
                      <div className="flex justify-between items-center mb-5">
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Awaiting Approval
                          </p>
                          <h4 className="font-black text-gray-900 text-xl tracking-tight">{match.rides.driver_name}</h4>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fare</p>
                           <p className="font-black text-2xl text-gray-900 leading-none">£{Number(match.rides.price).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200/50">
                           <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-gray-400"/> {formatShortDate(match.rides.ride_date)}</span>
                           <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-400"/> {match.rides.departure_time}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">From</p>
                            <p className="font-bold text-gray-900 text-sm truncate">{match.pickup_postcode.split(' ')[0]}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                          <div className="flex-1 text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">To</p>
                            <p className="font-bold text-gray-900 text-sm truncate">{match.rides.destination_hub}</p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => triggerCancelWarning(match, 'request')} 
                        className="w-full py-3.5 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex justify-center items-center gap-2 border border-transparent hover:border-red-100"
                      >
                        Withdraw Seat Request
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {!hasPending && !hasConfirmed && (
              <div className="text-center py-16 px-4 bg-white rounded-[32px] border border-gray-100 shadow-sm mt-8">
                <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Navigation className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">No Active Commutes</h3>
                <p className="text-gray-500 text-sm font-medium mb-8">You don't have any upcoming shifts scheduled. Let's find your next ride.</p>
                <Link href="/search" className="bg-gray-900 text-white font-black px-8 py-4 rounded-xl shadow-lg hover:bg-gray-800 transition-all active:scale-95 inline-flex items-center gap-2">
                  <Search className="h-5 w-5" /> Search Routes
                </Link>
              </div>
            )}
          </div>
        )}

        {/* --- CALENDAR VIEW --- */}
        {viewMode === 'calendar' && (
          <div className="space-y-6 animate-in slide-in-from-left-4">
            
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="h-5 w-5 text-gray-600" /></button>
                <h4 className="font-black text-lg text-gray-900">
                  {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </h4>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="h-5 w-5 text-gray-600" /></button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-3 text-center">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <div key={day} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 justify-items-center">
                {generateCalendarGrid()}
              </div>
            </div>

            <div className="bg-gray-900 rounded-[24px] p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-4 border-b border-gray-800 pb-4 mb-4">
                 <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(selectedCalendarDate).toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                    <p className="text-2xl font-black text-white leading-none">{new Date(selectedCalendarDate).getDate()}</p>
                 </div>
                 <div className="w-px h-10 bg-gray-800"></div>
                 <div>
                    {selectedDayTrips.length > 0 ? (
                      <div>
                        <p className="text-sm font-black text-emerald-400 mb-0.5">Ride Confirmed</p>
                        <p className="text-[11px] font-bold text-gray-400">Driver: {selectedDayTrips[0].rides?.driver_name}</p>
                      </div>
                    ) : selectedDayPending.length > 0 ? (
                      <div>
                        <p className="text-sm font-black text-orange-400 mb-0.5">Approval Pending</p>
                        <p className="text-[11px] font-bold text-gray-400">Waiting for driver response</p>
                      </div>
                    ) : selectedDayRota ? (
                      <div>
                        <p className="text-sm font-black text-white mb-0.5">{selectedDayRota.destination_hub}</p>
                        <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedDayRota.shift_time}</p>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-gray-500">No shifts or rides scheduled.</p>
                    )}
                 </div>
              </div>

              {!selectedDayTrips.length && !selectedDayPending.length && selectedDayRota && (
                 <Link href={`/search?date=${selectedCalendarDate}`} className="w-full bg-emerald-500 text-gray-900 font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors">
                   <Car className="h-4 w-4" /> Find Ride for this Shift
                 </Link>
              )}
            </div>

          </div>
        )}

      </main>

      {/* --- CANCEL MODAL --- */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 pb-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 text-center relative overflow-hidden">
             
             <button onClick={() => setCancelModalOpen(false)} className="absolute top-4 right-4 h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <X className="h-4 w-4" />
             </button>

             <div className="mx-auto h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-4 border-[6px] border-white shadow-sm relative z-10 mt-2">
               <AlertTriangle className="h-8 w-8 text-red-500" />
             </div>
             
             <h3 className="text-2xl font-black text-gray-900 mb-2">Cancel Commute?</h3>
             <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 px-2">
               {cancelType === 'confirmed' ? 'This will notify the driver and forfeit your confirmed seat. This action cannot be undone.' : 'This will remove your request from the live driver network.'}
             </p>
             
             <div className="flex flex-col gap-3">
               <button onClick={executeCancel} disabled={!!cancelingId} className="w-full py-4 text-base font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
                 {cancelingId ? <Loader2 className="h-5 w-5 animate-spin" /> : "Yes, Cancel Ride"}
               </button>
               <button onClick={() => setCancelModalOpen(false)} className="w-full py-4 text-base font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors active:scale-95">
                 Keep My Ride
               </button>
             </div>
          </div>
        </div>
      )}

      <PassengerBottomNav />
    </div>
  );
}