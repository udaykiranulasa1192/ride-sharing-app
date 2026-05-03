"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Phone, Mail, Lock, User, Car, Hash, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// 1. Define exactly what props this component is allowed to accept
interface DriverAuthFormProps {
  onSuccess: () => void | Promise<boolean>; 
}

// 2. Apply the interface to the component
export default function DriverAuthForm({ onSuccess }: DriverAuthFormProps) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [postcode, setPostcode] = useState(""); 

  // Strict Phone Formatter
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(value);
  };

  // Strict Postcode Formatter (Auto Capitalize & Space)
  const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
    
    if (val.length > 7) {
        val = val.slice(0, 7); 
    }

    if (val.length > 3) {
      val = val.slice(0, val.length - 3) + ' ' + val.slice(val.length - 3);
    }
    
    setPostcode(val);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (authMode === 'signup') {
        if (!postcode || !registrationNumber || !vehicleDetails || mobile.length < 10) {
          setErrorMsg("Please fill in all required fields correctly (Phone must be 10 digits).");
          setIsSubmitting(false);
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          const fullPhoneNumber = `+44${mobile}`; 

          const { error: profileError } = await supabase.from('driver_profiles').insert([{
            id: authData.user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            mobile_number: fullPhoneNumber,
            vehicle_details: vehicleDetails,
            registration_number: registrationNumber.toUpperCase().replace(/\s/g, ''), 
            postcode: postcode 
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

  const inputClass = "w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pr-4 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400";

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-md mx-auto w-full relative overflow-hidden mt-8">
      
      {/* IMPROVED HEADER: Logo on Left (Clickable), Back Button on Right */}
      <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center justify-between">
        
        {/* Clickable Logo linking to Home */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
                <Car className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black text-gray-900 tracking-tight">ShiftPool</span>
        </Link>

        {/* Explicit Back Button */}
{/* Explicit Back Button */}
<button 
  onClick={() => router.back()} 
  className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
  type="button"
>
  <ArrowLeft className="h-5 w-5" />
</button>       

      </div>

      <div className="p-6">
        <h2 className="text-xl font-black text-gray-900 text-center mb-6">
          {authMode === 'login' ? 'Driver Login' : 'Register as Driver'}
        </h2>

        {/* Toggle between Login and Signup */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
          <button onClick={() => setAuthMode('login')} type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>Log In</button>
          <button onClick={() => setAuthMode('signup')} type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500'}`}>Sign Up</button>
        </div>

        {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg text-center">{errorMsg}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                  <input required type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className={`${inputClass} pl-10`} />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                  <input required type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className={`${inputClass} pl-10`} />
                </div>
              </div>
              
              <div className="relative flex items-center">
                <Phone className="absolute left-3 h-5 w-5 text-emerald-600 z-10" />
                <span className="absolute left-10 text-gray-900 font-bold z-10 select-none bg-gray-50 border-r border-gray-300 pr-2 py-1">+44</span>
                <input required type="tel" placeholder="7700900000" value={mobile} onChange={handlePhoneChange} className={`${inputClass} pl-[72px] font-medium tracking-wider`} />
              </div>
              
              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input required type="text" placeholder="Vehicle (e.g. Black Prius)" value={vehicleDetails} onChange={e => setVehicleDetails(e.target.value)} className={`${inputClass} pl-10`} />
              </div>
              
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input required type="text" placeholder="Reg Plate (e.g. AB12 CDE)" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} className={`${inputClass} pl-10 uppercase`} />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input required type="text" placeholder="Home Postcode (e.g. CF14 2QR)" value={postcode} onChange={handlePostcodeChange} maxLength={8} className={`${inputClass} pl-10 uppercase font-bold tracking-widest text-emerald-900`} />
              </div>
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
            <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={`${inputClass} pl-10`} />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
            <input required type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pl-10`} />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full mt-4 flex justify-center items-center gap-2 rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-70 shadow-md">
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (authMode === 'login' ? "Log In" : "Create Driver Profile")}
          </button>
        </form>
      </div>
    </div>
  );
}