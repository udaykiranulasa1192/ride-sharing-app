"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  MapPin, 
  Clock, 
  Users, 
  Loader2, 
  Car, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  MessageCircle,
  AlertTriangle,
  X,
  LayoutDashboard,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Calendar,
  ChevronRight,
  BellRing
} from "lucide-react";
import Link from "next/link";
import DriverNav from "@/components/DriverNav";
import PassengerAuthForm from "@/components/PassengerAuthForm"; 

export default function DriverDashboard() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [myRides, setMyRides] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [passengerProfiles, setPassengerProfiles] = useState<Record<string, any>>({});

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rideToCancel, setRideToCancel] = useState<string | null>(null);

  // Toast Notification State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch active rides
      const { data: ridesData } = await supabase
        .from('rides')
        .select(`
          *,
          trip_matches (
            id, pickup_postcode, seats_needed, match_status, passenger_id
          )
        `)
        .eq('driver_id', user.id)
        .in('status', ['active', 'full'])
        .gte('ride_date', today)
        .order('ride_date', { ascending: true });

      // 2. Fetch pending requests
      const { data: requestsData } = await supabase
        .from('trip_matches')
        .select(`
          *,
          rides!inner(driver_id, departure_time, destination_hub, ride_date)
        `)
        .eq('rides.driver_id', user.id)
        .eq('match_status', 'pending')
        .gte('rides.ride_date', today);

      // 3. Gather profiles
      const passengerIds = new Set<string>();
      ridesData?.forEach(ride => {
        ride.trip_matches?.forEach((match: any) => {
          if (match.passenger_id) passengerIds.add(match.passenger_id);
        });
      });
      requestsData?.forEach(req => {
        if (req.passenger_id) passengerIds.add(req.passenger_id);
      });

      if (passengerIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('passenger_profiles')
          .select('id, first_name, last_name, mobile_number')
          .in('id', Array.from(passengerIds));

        const pMap: Record<string, any> = {};
        profilesData?.forEach(p => { pMap[p.id] = p; });
        setPassengerProfiles(pMap);
      }

      if (ridesData) setMyRides(ridesData);
      if (requestsData) setPendingRequests(requestsData);

    } catch (error) {
      console.error("Dashboard Error:", error);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }

  const handleAccept = async (req: any) => {
    setProcessingId(req.id);
    
    const requestId = req.id;
    const rideId = req.ride_id;
    const seatsNeeded = req.seats_needed;
    const passengerId = req.passenger_id;
    const rideDate = req.rides?.ride_date;
    const departureTime = req.rides?.departure_time;

    const { data: checkReq, error: checkError } = await supabase
      .from('trip_matches')
      .select('match_status')
      .eq('id', requestId)
      .single();

    if (checkError || !checkReq || checkReq.match_status !== 'pending') {
      setErrorMessage("Oops! Another driver just accepted this passenger.");
      await fetchDashboardData(); 
      setProcessingId(null);
      return; 
    }

    const { data: rideData } = await supabase.from('rides').select('remaining_seats, total_seats_capacity').eq('id', rideId).single();
    
    if (rideData) {
      const newSeats = rideData.remaining_seats - seatsNeeded;
      const newStatus = newSeats <= 0 ? 'full' : 'active';
      
      await supabase.from('rides').update({ remaining_seats: newSeats, status: newStatus }).eq('id', rideId);
      await supabase.from('trip_matches').update({ match_status: 'confirmed' }).eq('id', requestId);
      
      if (passengerId && rideDate) {
        await supabase.from('open_requests').delete().eq('passenger_id', passengerId).eq('ride_date', rideDate);
      }
      if (passengerId && rideDate && departureTime) {
        const { data: otherPendingRequests } = await supabase
          .from('trip_matches')
          .select('id, rides!inner(ride_date, departure_time)')
          .eq('passenger_id', passengerId)
          .eq('match_status', 'pending')
          .eq('rides.ride_date', rideDate)
          .eq('rides.departure_time', departureTime);

        if (otherPendingRequests && otherPendingRequests.length > 0) {
          const idsToDelete = otherPendingRequests.map(pReq => pReq.id);
          await supabase.from('trip_matches').delete().in('id', idsToDelete);
        }
      }

      await fetchDashboardData();
    }
    setProcessingId(null);
  };

  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    await supabase.from('trip_matches').update({ match_status: 'declined' }).eq('id', requestId);
    await fetchDashboardData();
    setProcessingId(null);
  };

  const triggerCancelWarning = (rideId: string) => {
    setRideToCancel(rideId);
    setCancelModalOpen(true);
  };

  const confirmCancelTrip = async () => {
    if (!rideToCancel) return;
    setProcessingId(rideToCancel);
    
    await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideToCancel);
    await supabase.from('trip_matches').update({ match_status: 'cancelled' }).eq('ride_id', rideToCancel);
    
    await fetchDashboardData();
    
    setProcessingId(null);
    setCancelModalOpen(false);
    setRideToCancel(null);
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing Manifest</p>
      </div>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-md mx-auto pt-20 px-6 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="h-24 w-24 bg-white border-2 border-emerald-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-600/10 rotate-3">
            <Car className="h-12 w-12 text-emerald-600 -rotate-3" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Driver Portal</h2>
        <p className="text-gray-500 text-sm font-medium mb-10 leading-relaxed">Sign in to manage your routes, accept passengers, and track your earnings.</p>
        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
          <PassengerAuthForm onSuccess={fetchDashboardData} />
        </div>
      </div>
      <DriverNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32 relative">
      
      {/* Toast Notification */}
      {errorMessage && (
        <div className="fixed top-4 left-0 right-0 z-[200] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-gray-900 text-white rounded-[20px] p-4 shadow-2xl flex items-center gap-3 w-full max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
            <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
            <p className="flex-1 text-sm font-bold">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="text-gray-400 hover:text-white p-1 bg-gray-800 rounded-full transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* PREMIUM HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Command Center</h1>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Driver Operations</p>
          </div>
          <Link href="/driver/post" className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-colors active:scale-95">
             <Car className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-8 animate-in fade-in">
        
        {/* EARNINGS VAULT CARD */}
        <Link href="/driver/earnings" className="relative bg-gray-900 rounded-[32px] p-6 shadow-xl shadow-gray-900/20 overflow-hidden block group active:scale-[0.98] transition-transform">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-gray-800 border border-gray-700 rounded-[20px] flex items-center justify-center shadow-inner">
                <Wallet className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Financials</p>
                <p className="font-black text-xl text-white tracking-tight leading-none">Earnings Vault</p>
              </div>
            </div>
            <div className="h-10 w-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 group-hover:text-emerald-400 group-hover:bg-gray-700 transition-colors">
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </Link>

        {/* --- PENDING REQUESTS (RADAR) --- */}
        {pendingRequests.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 pl-2">
               <BellRing className="h-4 w-4 text-orange-500 animate-pulse" />
               <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Action Required</h2>
            </div>
            
            {pendingRequests.map((req) => {
              const passenger = passengerProfiles[req.passenger_id] || { first_name: 'Unknown', last_name: 'User' };

              return (
                <div key={req.id} className="bg-white rounded-[24px] border-2 border-orange-400 p-1 shadow-lg shadow-orange-600/10 overflow-hidden relative">
                  <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none">
                    <BellRing className="h-40 w-40 text-orange-600" />
                  </div>
                  
                  <div className="bg-white rounded-[20px] p-5 relative z-10">
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 font-black text-xl border border-orange-100">
                          {passenger.first_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-lg leading-tight">{passenger.first_name} {passenger.last_name}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Seat Request</p>
                        </div>
                      </div>
                      <div className="bg-gray-100 px-3 py-1.5 rounded-xl text-xs font-black text-gray-900 flex items-center gap-1.5 shadow-sm border border-gray-200">
                        <Users className="h-3 w-3 text-gray-500" /> {req.seats_needed}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100 space-y-3">
                       <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pickup Point</p>
                         <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gray-400"/> {req.pickup_postcode}</p>
                       </div>
                       <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Hub</p>
                         <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5 text-gray-400"/> {req.rides?.destination_hub}</p>
                       </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAccept(req)}
                        disabled={!!processingId}
                        className="flex-[2] bg-gray-900 text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-800 shadow-md active:scale-95 transition-all disabled:opacity-50"
                      >
                        {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Approve Request
                      </button>
                      <button 
                        onClick={() => handleDecline(req.id)}
                        disabled={!!processingId}
                        className="flex-1 bg-white border border-gray-200 text-gray-500 py-3.5 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* --- ACTIVE ROUTES (MANIFEST) --- */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pl-2">
             <MapPin className="h-4 w-4 text-emerald-600" />
             <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Active Manifests</h2>
          </div>
          
          {myRides.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-[32px] p-10 text-center shadow-sm">
              <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Car className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-black text-gray-900 text-lg mb-1">No Shifts Scheduled</p>
              <p className="text-sm font-medium text-gray-500">Post a new route to start accepting passengers.</p>
            </div>
          ) : (
            myRides.map((ride) => {
              const confirmedMatches = ride.trip_matches?.filter((m: any) => m.match_status === 'confirmed') || [];

              return (
                <div key={ride.id} className="bg-white rounded-[32px] shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden mb-6">
                  
                  {/* Status Ribbon */}
                  <div className={`h-2 w-full ${ride.status === 'full' ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}></div>

                  <div className="p-6 space-y-6">
                    {/* Header Info */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Destination Hub</p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{ride.destination_hub}</h3>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg border flex flex-col items-center justify-center ${ride.status === 'full' ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${ride.status === 'full' ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {ride.status === 'full' ? 'Full' : 'Seats'}
                        </span>
                        <span className={`text-lg font-black leading-none ${ride.status === 'full' ? 'text-orange-700' : 'text-emerald-700'}`}>
                          {ride.remaining_seats}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Date</p>
                         <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-gray-400"/> {formatShortDate(ride.ride_date)}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Shift Start</p>
                         <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 justify-end"><Clock className="h-3.5 w-3.5 text-gray-400"/> {ride.departure_time}</p>
                      </div>
                    </div>

                    {/* Passenger Manifest Line */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                        <Users className="h-3.5 w-3.5" /> Approved Passengers
                      </h4>
                      
                      {confirmedMatches.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
                          <p className="text-sm font-bold text-gray-400">Waiting for bookings...</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {confirmedMatches.map((match: any, idx: number) => {
                            const passenger = passengerProfiles[match.passenger_id] || {};
                            const phone = passenger.mobile_number?.replace('+', '') || "";
                            const waLink = `https://wa.me/${phone}?text=Hi! I am your driver for the ${ride.departure_time} shift to ${ride.destination_hub}.`;

                            return (
                              <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 truncate pr-2">
                                  <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-black shrink-0 border border-gray-200">
                                    {passenger.first_name?.charAt(0) || '?'}
                                  </div>
                                  <div className="truncate">
                                    <p className="font-black text-gray-900 text-sm truncate">{passenger.first_name} {passenger.last_name}</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 mt-0.5 truncate">
                                      <MapPin className="h-3 w-3 text-emerald-500 shrink-0" /> {match.pickup_postcode}
                                    </p>
                                  </div>
                                </div>
                                {phone && (
                                  <a href={waLink} target="_blank" rel="noreferrer" className="h-10 w-10 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 shadow-md active:scale-95">
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => triggerCancelWarning(ride.id)}
                      disabled={processingId === ride.id}
                      className="w-full py-4 rounded-xl border border-transparent text-gray-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors disabled:opacity-50 mt-2"
                    >
                      {processingId === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Cancel Route
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* --- PREMIUM CANCEL MODAL --- */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 pb-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 text-center relative overflow-hidden">
             
             <button onClick={() => setCancelModalOpen(false)} className="absolute top-4 right-4 h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <X className="h-4 w-4" />
             </button>

             <div className="mx-auto h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-4 border-[6px] border-white shadow-sm relative z-10 mt-2">
               <AlertTriangle className="h-8 w-8 text-red-500" />
             </div>
             
             <h3 className="text-2xl font-black text-gray-900 mb-2">Cancel Route?</h3>
             <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 px-2">
               This will permanently remove the route from the live network and automatically notify any assigned passengers.
             </p>
             
             <div className="flex flex-col gap-3">
               <button onClick={confirmCancelTrip} disabled={!!processingId} className="w-full py-4 text-base font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
                 {processingId ? <Loader2 className="h-5 w-5 animate-spin" /> : "Yes, Cancel Route"}
               </button>
               <button onClick={() => setCancelModalOpen(false)} className="w-full py-4 text-base font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors active:scale-95">
                 Keep My Route
               </button>
             </div>
          </div>
        </div>
      )}

      <DriverNav />
    </div>
  );
}