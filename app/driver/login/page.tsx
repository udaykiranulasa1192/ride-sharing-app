"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DriverLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

   if (error) {
  alert(error.message);
  setLoading(false);
} else {
  router.push("/driver"); // <-- CHANGED THIS
}
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Car className="h-7 w-7 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to Driver Hub</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form onSubmit={handleLogin} className="bg-white py-8 px-4 shadow-sm border border-gray-200 rounded-2xl space-y-6">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              required
              type="email"
              placeholder="Email Address"
              className="pl-10 w-full rounded-xl border border-gray-300 py-3 px-4 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 text-gray-900"
               onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              required
              type="password"
              placeholder="Password"
              className="pl-10 w-full rounded-xl border border-gray-300 py-3 px-4 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 text-gray-900"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto h-6 w-6" /> : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have a driver account? <Link href="/driver/register" className="text-emerald-600 font-bold">Register Now</Link>
        </p>
      </div>
    </div>
  );
}