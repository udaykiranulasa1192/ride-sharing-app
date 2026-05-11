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
  ClipboardList 
} from "lucide-react";
import Link from "next/link";

export default function DriverAuth() {
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
  const [carModel, setCarModel] = useState("");
  const [carReg, setCarReg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (authMode === 'signup') {
        
        // 1. DUPLICATE MOBILE CHECK (Checks both Passenger & Driver tables)
        const { data: existingPassengerMobile } = await supabase.from('passenger_profiles').select('id').eq('mobile_number', mobile).maybeSingle();
        const { data: existingDriverMobile } = await supabase.from('driver_profiles').select('id').eq('mobile_number', mobile).maybeSingle();
        
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
            mobile_number: mobile,
            vehicle_details: carModel,
            registration_number: carReg.toUpperCase().replace(/\s/g, ''),
            home_postcode: postcode.toUpperCase()
          }]);

          if (profileError) throw new Error("Failed to create driver profile. Please contact support.");
        }

      } else {
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

  const inputClassName = "w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-sm text-gray-900 font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-gray-400 placeholder:font-medium shadow-sm";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
     {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-200 shadow-sm flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">
            {authMode === 'login' ? 'Driver Login' : 'Driver Registration'}
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

        {/* Toggle Login/Signup */}
        <div className="flex rounded-xl bg-gray-200/80 p-1 mb-8 shadow-inner">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setErrorMsg(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-lg transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Apply to Drive
          </button>
        </div>

        {/* Premium Error Message */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 flex items-start gap-3 rounded-2xl animate-in zoom-in-95 duration-300 shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-red-700 leading-snug">{errorMsg}</p>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="tel" placeholder="Mobile (07...)" value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClassName} />
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
            </div>
          )}

          <div className="h-px w-full bg-gray-200 my-6" />

          {/* STANDARD EMAIL & PASSWORD */}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input required type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input required type="password" placeholder="Password (Min. 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassName} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-8 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-base font-black text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-gray-900/20"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin text-emerald-400" /> : null}
            {isSubmitting ? "Authenticating..." : (authMode === 'login' ? "Secure Login" : "Create Driver Account")}
          </button>
        </form>

      </main>
    </div>
  );
}