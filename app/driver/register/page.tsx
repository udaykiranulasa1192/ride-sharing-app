"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  Loader2, 
  Phone, 
  Mail, 
  Lock, 
  User, 
  MapPin, 
  AlertCircle, 
  Car, 
  ClipboardList,
  CheckCircle 
} from "lucide-react";
import Link from "next/link";

export default function DriverAuth() {
  const router = useRouter();
  // --- NEW: Added 'forgot_password' state ---
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setResetSuccess(false);

    try {
      if (authMode === 'forgot_password') {
        // --- NEW: Forgot Password Logic ---
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`, 
        });
        if (error) throw error;
        setResetSuccess(true);
        setIsSubmitting(false);
        return; // Stop here so it doesn't try to log them in
      }

      if (authMode === 'signup') {
        const fullPhoneNumber = `+44${mobile}`;
        
        // 1. DUPLICATE MOBILE CHECK (Checks both Passenger & Driver tables)
        const { data: existingPassengerMobile } = await supabase.from('passenger_profiles').select('id').eq('mobile_number', fullPhoneNumber).maybeSingle();
        const { data: existingDriverMobile } = await supabase.from('driver_profiles').select('id').eq('mobile_number', fullPhoneNumber).maybeSingle();
        
        if (existingPassengerMobile || existingDriverMobile) {
          throw new Error("This mobile number is already registered to an existing account.");
        }

        // 2. Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) {
          if (authError.message.includes("User already registered")) {
            throw new Error("This email address is already in use. Please log in instead.");
          }
          throw authError;
        }

        // 3. Create their Driver Profile
        if (authData.user) {
          const { error: profileError } = await supabase.from('driver_profiles').insert([{
            id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            mobile_number: fullPhoneNumber,
            vehicle_details: carModel,
            registration_number: carReg.toUpperCase().replace(/\s/g, ''),
            home_postcode: postcode.toUpperCase()
          }]);

          if (profileError) throw new Error("Failed to create driver profile. Please contact support.");
        }

      } else if (authMode === 'login') {
        // --- LOGIN FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw new Error("Invalid email or password.");

        // --- ROLE ENFORCEMENT (Security Check) ---
        if (authData.user) {
          const { data: driverProfile } = await supabase
            .from('driver_profiles')
            .select('id')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (!driverProfile) {
            // They are not a driver (they are a passenger). Sign them out immediately!
            await supabase.auth.signOut();
            throw new Error("Access Denied: You are registered as a Passenger. Please use the Passenger App to log in.");
          }
        }
      }

      // If successful, send them straight to the command center!
      router.push("/driver/dashboard");
      
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-14 pr-4 text-sm text-gray-900 font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-gray-400 placeholder:font-medium shadow-sm";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
     {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-200 shadow-sm flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">
            {authMode === 'forgot_password' ? 'Reset Password' : authMode === 'login' ? 'Driver Login' : 'Driver Registration'}
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-5 py-8 animate-in fade-in slide-in-from-bottom-4">
        
        {/* Decorative Driver Logo */}
        <div className="flex justify-center mb-8">
          <div className="h-16 w-16 bg-gray-900 rounded-[20px] flex items-center justify-center shadow-xl shadow-gray-900/20">
            <Car className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        {/* Toggle Login/Signup (Hide when in forgot password mode) */}
        {authMode !== 'forgot_password' && (
          <div className="flex rounded-xl bg-gray-200/80 p-1 mb-8 shadow-inner">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(""); setResetSuccess(false); }}
              className={`flex-1 py-3 text-sm font-black rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setErrorMsg(""); setResetSuccess(false); }}
              className={`flex-1 py-3 text-sm font-black rounded-lg transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Apply to Drive
            </button>
          </div>
        )}

        {/* Premium Error Message */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 flex items-start gap-3 rounded-2xl animate-in zoom-in-95 duration-300 shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-red-700 leading-snug">{errorMsg}</p>
          </div>
        )}

        {/* Success Message for Password Reset */}
        {resetSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 flex items-start gap-3 rounded-2xl animate-in zoom-in-95 duration-300 shadow-sm">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-emerald-800 leading-snug">
              Success! Check your email for a secure link to reset your password.
            </p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* SIGNUP EXTRA FIELDS */}
          {authMode === 'signup' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 mt-2 mb-1">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClassName} />
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClassName} />
                </div>
              </div>

              {/* THE FIX: Fixed Padding and added the +44 indicator */}
              <div className="grid grid-cols-1 gap-4">
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 h-5 w-5 text-gray-400 z-10" />
                  <span className="absolute left-11 text-gray-400 font-bold z-10 pr-2 border-r border-gray-200">+44</span>
                  {/* Notice the pl-[84px] and tracking-wider overrides here */}
                  <input required type="tel" placeholder="7700..." value={mobile} onChange={handlePhoneChange} className={`${inputClassName} pl-[84px] tracking-wider`} />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="text" placeholder="Home Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={`${inputClassName} uppercase`} />
                </div>
              </div>

              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 pt-2 mb-1">Vehicle Details</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="text" placeholder="Vehicle Make & Model (e.g. Silver Toyota Golf)" value={carModel} onChange={(e) => setCarModel(e.target.value)} className={inputClassName} />
                </div>
                <div className="relative">
                  <ClipboardList className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="text" placeholder="Registration Plate (e.g. AB23 CDE)" value={carReg} onChange={(e) => setCarReg(e.target.value)} className={`${inputClassName} uppercase`} />
                </div>
              </div>
              
              <div className="h-px w-full bg-gray-200 my-6" />
            </div>
          )}

          {/* STANDARD EMAIL & PASSWORD */}
          <div className="space-y-4">
            {!resetSuccess && (
              <div className="relative animate-in fade-in">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} />
              </div>
            )}
            
            {authMode !== 'forgot_password' && (
              <div className="relative animate-in fade-in">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="password" placeholder="Password (Min. 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassName} />
              </div>
            )}
            
            {/* THE FIX: Forgot Password Button */}
            {authMode === 'login' && (
              <div className="flex justify-end mt-1">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('forgot_password'); setErrorMsg(''); setResetSuccess(false); }} 
                  className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          {!resetSuccess && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-8 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-base font-black text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-gray-900/20"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin text-emerald-400" /> : null}
              {isSubmitting ? "Processing..." : authMode === 'login' ? "Secure Login" : authMode === 'signup' ? "Create Driver Account" : "Send Reset Link"}
            </button>
          )}

          {/* Back to Login button if in Forgot Password mode */}
          {(authMode === 'forgot_password' || resetSuccess) && (
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setResetSuccess(false); setErrorMsg(""); }}
              className="w-full mt-4 py-4 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Back to Login
            </button>
          )}
        </form>

      </main>
    </div>
  );
}