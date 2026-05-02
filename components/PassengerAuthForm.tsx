"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft, Car, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PassengerAuthForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("+44"); // Locked Default

  // Strict UK Phone Formatter
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Prevent user from deleting the +44 prefix
    if (!val.startsWith("+44")) {
      val = "+44";
    }
    // Only allow numbers after the prefix
    const rawNumber = val.replace("+44", "").replace(/[^0-9]/g, "");
    setPhone("+44" + rawNumber);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/passenger/dashboard");
      } else {
        // Registration Flow
        // Ensure phone number is a valid UK length (roughly 10 digits after +44)
        if (phone.length < 12 || phone.length > 13) {
          throw new Error("Please enter a valid UK mobile number.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone_number: phone,
              role: 'passenger' // Explicitly tag them
            }
          }
        });
        if (error) throw error;
        
        alert("Registration successful! You can now log in.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-3xl shadow-xl border border-gray-100">
      
      {/* HEADER: Navigation & Logo */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()} 
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-emerald-600 p-2 rounded-xl group-hover:bg-emerald-700 transition-colors">
            <Car className="h-5 w-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tight text-gray-900 group-hover:text-emerald-700 transition-colors">ShiftPool</span>
        </Link>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          {isLogin ? "Welcome back" : "Create passenger account"}
        </h2>
        <p className="text-sm font-bold text-gray-400 mt-1">
          {isLogin ? "Enter your details to find a ride." : "Join to start booking shifts."}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {!isLogin && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">First Name</label>
                <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Last Name</label>
                <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Mobile Number (WhatsApp)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input required type="tel" value={phone} onChange={handlePhoneChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-900" />
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Email Address</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Password</label>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 mt-6">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {isLogin ? "Sign In" : "Create Account"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
          {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}