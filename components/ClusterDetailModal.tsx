"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, MapPin, Navigation, Info, ShieldCheck, Loader2 } from "lucide-react";

interface ClusterDetailProps {
  cluster: any;
  driverProfile: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClusterDetailModal({ cluster, driverProfile, onClose, onSuccess }: ClusterDetailProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError(null);

    // Prepare the IDs for our atomic SQL function
    const requestIds = cluster.requests.map((r: any) => r.id);

    const { data, error: rpcError } = await supabase.rpc('accept_passenger_cluster', {
      p_driver_id: driverProfile.id,
      p_driver_name: `${driverProfile.first_name} ${driverProfile.last_name}`,
      p_vehicle: driverProfile.vehicle_details,
      p_ride_date: cluster.date,
      p_departure_time: cluster.time,
      p_trip_type: 'one_way', // Default for now
      p_price: 5.00, // This should eventually be a dynamic input
      p_capacity: 4, // Matches standard car size
      p_request_ids: requestIds
    });

    if (rpcError) {
      setError(rpcError.message);
      setIsSubmitting(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-black text-gray-900 uppercase tracking-tight">Confirm Trip Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Trip Summary Card */}
          <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200">
            <div className="flex items-center gap-3 mb-4">
              <Navigation className="h-6 w-6" />
              <div>
                <p className="text-[10px] font-black uppercase opacity-70">Destination Hub</p>
                <p className="text-xl font-black leading-none">{cluster.destination}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-emerald-500/50 pt-4">
              <div>
                <p className="text-[10px] font-bold uppercase opacity-70">Travel Date</p>
                <p className="font-bold">{new Date(cluster.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase opacity-70">Shift Time</p>
                <p className="font-bold">{cluster.time}</p>
              </div>
            </div>
          </div>

          {/* Stop List */}
          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Route Stop List</h4>
            <div className="space-y-3">
              {cluster.requests.map((req: any, i: number) => (
                <div key={req.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 leading-tight">{req.pickup_postcode}</p>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter">
                      Pickup Request • {req.seats_needed} Seat(s)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Notice */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              Accepting this cluster will notify all {cluster.people} passengers immediately. Please ensure your vehicle is ready for travel at the specified shift time.
            </p>
          </div>

          {error && (
            <p className="text-center text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg">
              Error: {error}
            </p>
          )}

          <button 
            onClick={handleAccept}
            disabled={isSubmitting}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            Confirm & Claim All Jobs
          </button>
        </div>
      </div>
    </div>
  );
}