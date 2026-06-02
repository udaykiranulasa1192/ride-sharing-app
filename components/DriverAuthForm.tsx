"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Phone, Mail, Lock, User, MapPin, ArrowLeft, Car, ClipboardList, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DriverAuthFormProps {
  onSuccess: () => void;
}

export default function DriverAuthForm({ onSuccess }: DriverAuthFormProps) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [postcode, setPostcode] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carReg, setCarReg] = useState("");

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
    setResetSuccess(false);

    try {
      if (authMode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`, 
        });
        if (error) throw error;
        setResetSuccess(true);
        setIsSubmitting(false);
        return; 
      }

      if (authMode === 'signup') {
        const fullPhoneNumber = `+44${mobile}`;
        
        // --- DUPLICATE MOBILE CHECK ---
        const { data: existingPassengerMobile } = await supabase.from('passenger_profiles').select('id').eq('mobile_number', fullPhoneNumber).maybeSingle();
        const { data: existingDriverMobile } = await supabase.from('driver_profiles').select('id').eq('mobile_number', fullPhoneNumber).maybeSingle();
        
        if (existingPassengerMobile || existingDriverMobile) {
          throw new Error("This mobile number is already registered to an existing account.");
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        
        if (authError) {
          if (authError.message.includes("User already registered")) {
            throw new Error("This email address is already in use. Please log in instead.");
          }
          throw authError;
        }

       if (authData.user) {
          const { error: profileError } = await supabase.from('driver_profiles').insert([{
            id: authData.user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            mobile_number: fullPhoneNumber,
            postcode: postcode.toUpperCase(), // <-- THIS IS THE FIX
            vehicle_details: carModel,
            registration_number: carReg.toUpperCase().replace(/\s/g, ''),
          }]);
          if (profileError) throw profileError;
        }
      } else {
        // --- LOGIN FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw new Error("Invalid email or password.");

        // --- ROLE ENFORCEMENT (SECURITY CHECK) ---
        if (authData.user) {
          const { data: driverProfile } = await supabase
            .from('driver_profiles')
            .select('id')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (!driverProfile) {
            await supabase.auth.signOut();
            throw new Error("Access Denied: You are registered as a Passenger. Please use the Passenger App to log in.");
          }
        }
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-4 text-sm text-gray-900 font-bold focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all placeholder:text-gray-400 placeholder:font-medium";

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-md mx-auto w-full relative overflow-visible">
      <div className="bg-gray-50/50 border-b border-gray-100 p-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-md">
                <Car className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-black text-gray-900 tracking-tight uppercase">Driver Portal</span>
        </Link>
        <button type="button" onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-200 text-gray-400 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="p-8">
        <h2 className="text-2xl font-black text-gray-900 text-center mb-6">
          {authMode === 'forgot_password' ? 'Reset Password' : authMode === 'login' ? 'Driver Login' : 'Apply to Drive'}
        </h2>

        {authMode !== 'forgot_password' && (
          <div className="flex rounded-2xl bg-gray-100 p-1.5 mb-8">
            <button type="button" onClick={() => { setAuthMode('login'); setErrorMsg(""); setResetSuccess(false); }} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${authMode === 'login' ? 'bg-white shadow-md text-gray-900' : 'text-gray-400'}`}>LOG IN</button>
            <button type="button" onClick={() => { setAuthMode('signup'); setErrorMsg(""); setResetSuccess(false); }} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${authMode === 'signup' ? 'bg-white shadow-md text-gray-900' : 'text-gray-400'}`}>SIGN UP</button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 flex items-start gap-3 rounded-xl border border-red-100">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-red-700 leading-snug">{errorMsg}</p>
          </div>
        )}

        {resetSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 flex items-start gap-3 rounded-xl border border-emerald-100">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-emerald-800 leading-snug">
              Success! Check your email for a secure link to reset your password.
            </p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Personal Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className={`${inputClass} pl-10`} />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className={`${inputClass} pl-10`} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 h-5 w-5 text-gray-400 z-10" />
                  <span className="absolute left-10 text-gray-400 font-bold z-10 pr-2 border-r border-gray-200">+44</span>
                  <input required type="tel" placeholder="7700..." value={mobile} onChange={handlePhoneChange} className={`${inputClass} pl-[84px] tracking-wider`} />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required placeholder="Home Postcode" value={postcode} onChange={handlePostcodeChange} className={`${inputClass} pl-10 uppercase`} />
                </div>
              </div>

              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 pt-2">Vehicle Details</h3>
              <div className="space-y-3">
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required placeholder="Make & Model (e.g. Silver Golf)" value={carModel} onChange={e => setCarModel(e.target.value)} className={`${inputClass} pl-10`} />
                </div>
                <div className="relative">
                  <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required placeholder="Registration Plate" value={carReg} onChange={e => setCarReg(e.target.value)} className={`${inputClass} pl-10 uppercase`} />
                </div>
              </div>
              
              <div className="h-px w-full bg-gray-100 my-4" />
            </div>
          )}
          
          {!resetSuccess && (
            <div className="space-y-4 animate-in fade-in">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className={`${inputClass} pl-10`} />
              </div>
              
              {authMode !== 'forgot_password' && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="password" placeholder="Password (Min. 6 chars)" value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pl-10`} />
                </div>
              )}
            </div>
          )}

          {authMode === 'login' && (
            <div className="flex justify-end mt-1">
              <button 
                type="button" 
                onClick={() => { setAuthMode('forgot_password'); setErrorMsg(''); setResetSuccess(false); }} 
                className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {!resetSuccess && (
            <button type="submit" disabled={isSubmitting} className="w-full mt-6 bg-gray-900 text-white py-4 rounded-2xl font-black shadow-xl shadow-gray-900/20 hover:bg-gray-800 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin text-emerald-400" /> : authMode === 'login' ? "SECURE LOGIN" : authMode === 'signup' ? "CREATE ACCOUNT" : "SEND RESET LINK"}
            </button>
          )}

          {(authMode === 'forgot_password' || resetSuccess) && (
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setResetSuccess(false); setErrorMsg(""); }}
              className="w-full mt-2 py-3 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors"
            >
              Back to Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
}