"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Wallet, 
  TrendingUp, 
  Loader2, 
  CheckCircle,
  Banknote,
  ArrowLeft,
  CalendarDays,
  Calendar
} from "lucide-react";
import DriverNav from "@/components/DriverNav";
import Link from "next/link";
import PassengerAuthForm from "@/components/PassengerAuthForm";

export default function DriverEarnings() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Store the raw rides here
  const [allRides, setAllRides] = useState<any[]>([]);
  // The active tab state
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'total'>('total');

  useEffect(() => {
    fetchEarningsData();
  }, []);

  async function fetchEarningsData() {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const { data: rides } = await supabase
        .from('rides')
        .select(`
          *,
          trip_matches(id, match_status)
        `)
        .eq('driver_id', user.id)
        .eq('status', 'completed')
        .order('ride_date', { ascending: false });

      if (rides) {
        const enrichedRides = rides.map(ride => {
          const validPassengers = ride.trip_matches.filter((m: any) => m.match_status === 'confirmed').length;
          return {
            ...ride,
            totalEarned: ride.price * validPassengers,
            passengerCount: validPassengers
          };
        }).filter(r => r.passengerCount > 0); // Only keep rides that actually made money

        setAllRides(enrichedRides);
      }
    } catch (error) {
      console.error("Earnings Error:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- THE MATH ENGINE ---
  const getMondayKey = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.getUTCDay() || 7; 
    d.setUTCDate(d.getUTCDate() - (day - 1)); 
    return d.toISOString().split('T')[0]; 
  };

  const formatWeekRange = (mondayStr: string) => {
    const mon = new Date(mondayStr);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6); // Add 6 days to get Sunday

    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${mon.toLocaleDateString('en-GB', opts)} - ${sun.toLocaleDateString('en-GB', opts)}`;
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // --- THE FILTERING ENGINE (Runs instantly when clicking tabs) ---
  const { displayTotal, displayCount, groupedData } = useMemo(() => {
    const today = new Date();
    const currentMonday = getMondayKey(today.toISOString().split('T')[0]);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let filteredRides = allRides;

    // Filter based on selected tab
    if (timeframe === 'week') {
      filteredRides = allRides.filter(r => getMondayKey(r.ride_date) === currentMonday);
    } else if (timeframe === 'month') {
      filteredRides = allRides.filter(r => {
        const d = new Date(r.ride_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }

    let vaultTotal = 0;
    const weeksMap: Record<string, any> = {};

    filteredRides.forEach((ride) => {
      vaultTotal += ride.totalEarned;

      const weekKey = getMondayKey(ride.ride_date);
      if (!weeksMap[weekKey]) {
        weeksMap[weekKey] = {
          weekStart: weekKey,
          dateRangeString: formatWeekRange(weekKey), // "27 Apr - 4 May"
          weeklyTotal: 0,
          rides: []
        };
      }

      weeksMap[weekKey].weeklyTotal += ride.totalEarned;
      weeksMap[weekKey].rides.push(ride);
    });

    const sortedWeeks = Object.values(weeksMap).sort((a, b) => 
      new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
    );

    return {
      displayTotal: vaultTotal,
      displayCount: filteredRides.length,
      groupedData: sortedWeeks
    };
  }, [allRides, timeframe]);


  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-50 p-4 pb-32">
      <div className="max-w-md mx-auto pt-16 text-center">
        <div className="h-16 w-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Wallet className="h-8 w-8 text-gray-900" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Earnings Vault</h2>
        <p className="text-gray-500 text-sm mb-10">Sign in to view your payout history.</p>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <PassengerAuthForm onSuccess={fetchEarningsData} />
        </div>
      </div>
      <DriverNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/driver/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Earnings</h1>
          </div>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-6">

        {/* --- THE INTERACTIVE BANK CARD --- */}
        <div className="bg-gray-900 text-white rounded-3xl p-6 shadow-xl shadow-gray-900/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 border border-gray-800">
          <div className="absolute -right-4 -top-4 opacity-5">
            <Banknote className="h-40 w-40" />
          </div>
          
          <div className="relative z-10">
            
            {/* THE UPGRADE: The Segmented Toggle Control */}
            <div className="flex bg-gray-800 p-1 rounded-xl mb-6 shadow-inner border border-gray-700">
              <button 
                onClick={() => setTimeframe('week')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${timeframe === 'week' ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                This Week
              </button>
              <button 
                onClick={() => setTimeframe('month')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${timeframe === 'month' ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                This Month
              </button>
              <button 
                onClick={() => setTimeframe('total')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${timeframe === 'total' ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Lifetime
              </button>
            </div>

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> 
              {timeframe === 'week' && "This Week's Earnings"}
              {timeframe === 'month' && "This Month's Earnings"}
              {timeframe === 'total' && "Total Lifetime Balance"}
            </p>
            <h2 className="text-5xl font-black mb-6 tracking-tight text-emerald-400">£{displayTotal.toFixed(2)}</h2>
            
            <div className="flex items-center gap-3 bg-gray-800/80 backdrop-blur rounded-xl p-3 border border-gray-700">
              <div className="h-10 w-10 bg-gray-700 rounded-lg flex items-center justify-center text-gray-300">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed Shifts</p>
                <p className="font-bold text-white">{displayCount} Routes</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC HISTORY LIST --- */}
        {groupedData.length === 0 ? (
           <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl">
             <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-3" />
             <h3 className="font-bold text-gray-900 mb-1">No trips in this timeframe</h3>
             <p className="text-xs text-gray-500">You haven't completed any routes for the selected period.</p>
           </div>
        ) : (
          <div className="space-y-8">
            {groupedData.map((week) => (
              <div key={week.weekStart} className="animate-in fade-in">
                
                {/* THE UPGRADE: The "27 Apr - 4 May" Header */}
                <div className="flex justify-between items-end mb-3 px-1 border-b border-gray-200 pb-2">
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                      <CalendarDays className="h-3 w-3" /> Week Of
                    </h3>
                    <p className="font-bold text-gray-900 text-sm">{week.dateRangeString}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-emerald-600 leading-none">£{week.weeklyTotal.toFixed(2)}</p>
                  </div>
                </div>

                {/* Rides for this Week */}
                <div className="space-y-3">
                  {week.rides.map((ride: any) => (
                    <div key={ride.id} className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 truncate pr-4">{ride.destination_hub}</h3>
                          <p className="text-xs font-medium text-gray-500 mt-0.5">{formatShortDate(ride.ride_date)} • {ride.departure_time}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-900 text-base leading-none">£{ride.totalEarned.toFixed(2)}</p>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block">{ride.passengerCount} Seats</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
      <DriverNav />
    </div>
  );
}