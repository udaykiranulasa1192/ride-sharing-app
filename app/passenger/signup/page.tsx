"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Phone, Mail, Lock, User, MapPin, Briefcase, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function PassengerAuth() {
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
  const [workLocation, setWorkLocation] = useState(""); // NEW: Optional Work Location

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (authMode === 'signup') {
        
        // 1. DUPLICATE MOBILE CHECK: Check if mobile already exists in either table
        const { data: existingPassengerMobile } = await supabase.from('passenger_profiles').select('id').eq('mobile_number', mobile).maybeSingle();
        const { data: existingDriverMobile } = await supabase.from('driver_profiles').select('id').eq('mobile_number', mobile).maybeSingle();
        
        if (existingPassengerMobile || existingDriverMobile) {
          throw new Error("This mobile number is already registered to an existing account.");
        }

        // 2. Create the user in Supabase Auth (Supabase handles duplicate emails automatically)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) {
          // Format the default Supabase email error to look professional
          if (authError.message.includes("User already registered")) {
            throw new Error("This email address is already in use. Please log in instead.");
          }
          throw authError;
        }

        // 3. Create their Passenger Profile
        if (authData.user) {
          const { error: profileError } = await supabase.from('passenger_profiles').insert([{
            id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            mobile_number: mobile,
            postcode: postcode.toUpperCase(),
            work_location: workLocation || null // Added optional work location
          }]);

          if (profileError) throw profileError;
        }

      } else {
        // --- LOGIN FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw new Error("Invalid email or password.");

        // ROLE ENFORCEMENT: Check if they are actually a Passenger
        if (authData.user) {
          const { data: passengerProfile, error: profileError } = await supabase
            .from('passenger_profiles')
            .select('id')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (!passengerProfile) {
            // They are not a passenger (they are likely a driver). Sign them back out immediately!
            await supabase.auth.signOut();
            throw new Error("Access Denied: You are registered as a Driver. Please use the Driver Portal to log in.");
          }
        }
      }

      // If successful, send them straight to their dashboard!
      router.push("/passenger/dashboard");
      
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "w-full rounded-xl border border-gray-300 bg-gray-50 py-3.5 pl-11 pr-4 text-sm text-gray-900 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-gray-400 placeholder:font-medium";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
     {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/search" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">
            {authMode === 'login' ? 'Passenger Login' : 'Create Account'}
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-5 py-8 animate-in fade-in">
        
        {/* Toggle Login/Signup */}
        <div className="flex rounded-xl bg-gray-200/80 p-1 mb-8">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setErrorMsg(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-lg transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Premium Error Message */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 flex items-start gap-3 rounded-2xl animate-in slide-in-from-top-2 fade-in shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-red-700 leading-snug">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* SIGNUP EXTRA FIELDS */}
          {authMode === 'signup' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
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

              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="tel" placeholder="Mobile Number (e.g. 07700...)" value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClassName} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="text" placeholder="Home Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={`${inputClassName} uppercase`} />
                </div>
                
                {/* NEW: Optional Work Location */}
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="text" placeholder="Workplace (Optional)" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} className={inputClassName} />
                </div>
              </div>
            </div>
          )}

          {/* STANDARD EMAIL & PASSWORD */}
          <div className="h-px w-full bg-gray-100 my-4" />

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input required type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input required type="password" placeholder="Password (Min. 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassName} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-8 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-base font-black text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-gray-900/20"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {isSubmitting ? "Authenticating..." : (authMode === 'login' ? "Log In as Passenger" : "Create Passenger Profile")}
          </button>
        </form>

      </main>
    </div>
  );
}