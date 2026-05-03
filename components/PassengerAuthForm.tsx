"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Phone, Mail, Lock, User, MapPin, ArrowLeft, Car } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PassengerAuthFormProps {
  onSuccess: () => void;
}

export default function PassengerAuthForm({ onSuccess }: PassengerAuthFormProps) {
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
  const [postcode, setPostcode] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(value);
  };

  const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 7) val = val.slice(0, 7);
    if (val.length > 3) val = val.slice(0, val.length - 3) + ' ' + val.slice(val.length - 3);
    setPostcode(val);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (authMode === 'signup') {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('passenger_profiles').insert([{
            id: authData.user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            mobile_number: `+44${mobile}`,
            postcode: postcode.toUpperCase()
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

  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-4 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400";

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-md mx-auto w-full relative overflow-hidden">
      <div className="bg-gray-50/50 border-b border-gray-100 p-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-md">
                <Car className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black text-gray-900 tracking-tight">ShiftPool</span>
        </Link>
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-200 text-gray-400 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="p-8">
        <h2 className="text-2xl font-black text-gray-900 text-center mb-6">
          {authMode === 'login' ? 'Welcome Back' : 'Join as Passenger'}
        </h2>

        <div className="flex rounded-2xl bg-gray-100 p-1.5 mb-8">
          <button onClick={() => setAuthMode('login')} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${authMode === 'login' ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400'}`}>LOG IN</button>
          <button onClick={() => setAuthMode('signup')} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${authMode === 'signup' ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400'}`}>SIGN UP</button>
        </div>

        {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center border border-red-100">{errorMsg}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                  <input required placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className={`${inputClass} pl-10`} />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                  <input required placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className={`${inputClass} pl-10`} />
                </div>
              </div>
              <div className="relative flex items-center">
                <Phone className="absolute left-3 h-5 w-5 text-emerald-500 z-10" />
                <span className="absolute left-10 text-gray-400 font-bold z-10 pr-2 border-r border-gray-200">+44</span>
                <input required type="tel" placeholder="7700..." value={mobile} onChange={handlePhoneChange} className={`${inputClass} pl-20`} />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                <input required placeholder="Postcode" value={postcode} onChange={handlePostcodeChange} className={`${inputClass} pl-10 uppercase font-bold`} />
              </div>
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
            <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={`${inputClass} pl-10`} />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
            <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pl-10`} />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full mt-6 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (authMode === 'login' ? "LOG IN" : "CREATE ACCOUNT")}
          </button>
        </form>
      </div>
    </div>
  );
}