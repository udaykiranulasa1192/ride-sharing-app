"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Navigation, Clock, Users, ChevronRight, Loader2, RadioTower } from "lucide-react";

export default function DriverJobsBoard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    const { data } = await supabase
      .from('passenger_requests')
      .select('*')
      .eq('status', 'open')
      .order('ride_date', { ascending: true });
    
    if (data) setRequests(data);
    setLoading(false);
  }

  // Senior Logic: Grouping raw requests into "Clusters" for the UI
  const clusters = requests.reduce((acc, req) => {
    const key = `${req.destination_hub}-${req.ride_date}-${req.shift_start}`;
    if (!acc[key]) {
      acc[key] = { 
        destination: req.destination_hub, 
        date: req.ride_date, 
        time: req.shift_start, 
        people: 0,
        requests: [] 
      };
    }
    acc[key].people += req.seats_needed;
    acc[key].requests.push(req);
    return acc;
  }, {} as any);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-6 py-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <RadioTower className="h-5 w-5 text-emerald-600 animate-pulse" />
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Available Jobs</h1>
        </div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Real-time Passenger Clusters</p>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {Object.values(clusters).length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <Users className="h-12 w-12 mx-auto mb-2" />
            <p className="font-bold">No active broadcasts</p>
          </div>
        ) : (
          Object.values(clusters).map((cluster: any, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden hover:border-emerald-500 transition-all cursor-pointer group">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-100">
                    {cluster.people} Passengers Waiting
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shift Start</p>
                    <p className="font-black text-gray-900">{cluster.time}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Navigation className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Destination</p>
                      <p className="font-bold text-gray-900">{cluster.destination}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Travel Date</p>
                      <p className="font-bold text-gray-900">
                        {new Date(cluster.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <button className="w-full bg-gray-900 text-white py-4 font-bold text-sm flex items-center justify-center gap-2 group-hover:bg-emerald-600 transition-colors">
                View Details & Accept <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}