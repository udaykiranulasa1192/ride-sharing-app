
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, User, Mail, Lock, Phone, MapPin, Loader2, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DriverRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    carModel: "",
    carReg: "",
    phone: "",
    postcode: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Create the driver profile in our custom table
      const { error: profileError } = await supabase.from("driver_profiles").insert([
        {
          id: authData.user.id, // Hard-link to the Auth ID
          full_name: formData.fullName,
          car_model: formData.carModel,
          car_reg: formData.carReg.toUpperCase(),
          phone: formData.phone,
          postcode: formData.postcode.toUpperCase(),
        },
      ]);

      if (profileError) {
        alert("Error creating profile: " + profileError.message);
      } else {
        alert("Registration successful!");
        router.push("/driver/dashboard");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Car className="h-7 w-7 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create Driver Account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form onSubmit={handleRegister} className="bg-white py-8 px-4 shadow-sm border border-gray-200 rounded-2xl space-y-5">
          {/* Account Info */}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                required
                type="email"
                placeholder="Email Address"
                className="pl-10 w-full rounded-xl border border-gray-300 py-3 px-4 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 text-gray-900"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                required
                type="password"
                placeholder="Password (min 6 chars)"
                className="pl-10 w-full rounded-xl border border-gray-300 py-3 px-4 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 text-gray-900"
                 onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />

          {/* Profile Info */}
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                required
                placeholder="Full Name"
                className="pl-10 w-full rounded-xl border border-gray-300 py-3 px-4 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 text-gray-900"
                 onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            <div className="relative">
              <Car className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                required
                placeholder="Car Model (e.g. Blue VW Golf)"
                className="pl-10 w-full rounded-xl border border-gray-300 py-3 px-4 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 text-gray-900"
                  onChange={(e) => setFormData({...formData, carModel: e.target.value})}
              />
            </div>
            <div className="relative">
              <ClipboardList className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                required
                placeholder="Car Registration"
               className="pl-10 w-full rounded-xl border border-gray-300 py-3 px-4 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 text-gray-900"
                 onChange={(e) => setFormData({...formData, carReg: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  required
                  placeholder="Phone"
                  className="pl-10 w-full rounded-xl border border-gray-300 py-3 px-4 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 text-gray-900"
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  required
                  placeholder="Home Postcode"
                 className="pl-10 w-full rounded-xl border border-gray-300 py-3 px-4 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 text-gray-900"
                   onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto h-6 w-6" /> : "Register as Driver"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link href="/driver/login" className="text-emerald-600 font-bold">Sign In</Link>
        </p>
      </div>
    </div>
  );
}