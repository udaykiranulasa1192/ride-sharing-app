"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Phone, Mail, Lock, User, Car, Hash } from "lucide-react";

export default function DriverAuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  
  // UPDATED FIELDS:
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (authMode === 'signup') {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          // UPDATED DATABASE INSERT:
          const { error: profileError } = await supabase.from('driver_profiles').insert([{
            id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            mobile_number: mobile,
            vehicle_details: vehicleDetails,
            registration_number: registrationNumber.toUpperCase() // Force uppercase for plates!
          }]);
          if (profileError) throw profileError;
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400";

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-black text-gray-900 text-center mb-6">
        {authMode === 'login' ? 'Driver Login' : 'Register as Driver'}
      </h2>

      <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
        <button onClick={() => setAuthMode('login')} type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500'}`}>Log In</button>
        <button onClick={() => setAuthMode('signup')} type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500'}`}>Sign Up</button>
      </div>

      {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg">{errorMsg}</div>}

      <form onSubmit={handleAuth} className="space-y-4">
        {authMode === 'signup' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input required type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} /></div>
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input required type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} /></div>
            </div>
            
            <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input required type="tel" placeholder="WhatsApp Number" value={mobile} onChange={e => setMobile(e.target.value)} className={inputClass} /></div>
            
            {/* NEW FIELDS */}
            <div className="relative"><Car className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input required type="text" placeholder="Vehicle (e.g. Black Prius)" value={vehicleDetails} onChange={e => setVehicleDetails(e.target.value)} className={inputClass} /></div>
            <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input required type="text" placeholder="Registration (e.g. AB12 CDE)" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} className={`${inputClass} uppercase`} /></div>
          </div>
        )}
        <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} /></div>
        <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} /></div>

        <button type="submit" disabled={isSubmitting} className="w-full mt-4 flex justify-center items-center gap-2 rounded-xl bg-blue-600 py-4 text-sm font-bold text-white hover:bg-blue-700 active:scale-95 disabled:opacity-70">
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (authMode === 'login' ? "Log In" : "Create Driver Profile")}
        </button>
      </form>
    </div>
  );
}