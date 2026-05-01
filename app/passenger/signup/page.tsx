"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Phone, Mail, Lock, User, MapPin } from "lucide-react";
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (authMode === 'signup') {
        // 1. Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        // 2. Create their Passenger Profile
        if (authData.user) {
          const { error: profileError } = await supabase.from('passenger_profiles').insert([{
            id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            mobile_number: mobile,
            postcode: postcode.toUpperCase()
          }]);

          if (profileError) throw profileError;
        }
      } else {
        // Log them in
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
      }

      // If successful, send them straight to their dashboard!
      router.push("/passenger/dashboard");
      
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-200 shadow-sm flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">
          {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 py-8">
        
        {/* Toggle Login/Signup */}
        <div className="flex rounded-xl bg-gray-200 p-1 mb-8">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Log In
          </button>
          <button
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Sign Up
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* SIGNUP EXTRA FIELDS */}
          {authMode === 'signup' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClassName} />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClassName} />
                </div>
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="tel" placeholder="WhatsApp Number (e.g. 07700...)" value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClassName} />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="text" placeholder="Home Postcode (e.g. CF24 4QY)" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={`${inputClassName} uppercase`} />
              </div>
            </div>
          )}

          {/* STANDARD EMAIL & PASSWORD */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input required type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input required type="password" placeholder="Password (Min. 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassName} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70 shadow-md"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {isSubmitting ? "Processing..." : (authMode === 'login' ? "Log In to Account" : "Create Profile")}
          </button>
        </form>

      </main>
    </div>
  );
}