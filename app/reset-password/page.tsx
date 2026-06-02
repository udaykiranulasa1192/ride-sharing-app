"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Loader2, CheckCircle, AlertCircle, Car } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      // Supabase automatically knows WHICH user to update because clicking the 
      // email link securely logs them in behind the scenes!
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess(true);
      
      // Automatically log them out so they can log back in with their new credentials
      // and get routed to the correct Passenger or Driver portal
      await supabase.auth.signOut();

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password. Your link may have expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm text-gray-900 font-bold focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-gray-400 placeholder:font-medium shadow-sm";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="h-16 w-16 bg-emerald-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-emerald-600/20 mb-4">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create New Password</h1>
          <p className="text-sm font-medium text-gray-500 mt-2 text-center">
            Your identity has been verified. Please enter your new secure password below.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 flex items-start gap-3 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm font-bold text-red-700 leading-snug">{errorMsg}</p>
          </div>
        )}

        {success ? (
          <div className="text-center animate-in zoom-in-95">
            <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Password Updated!</h3>
            <p className="text-sm text-gray-600 mb-8 font-medium">
              Your password has been changed successfully. You can now log back into your account.
            </p>
            <Link 
              href="/" 
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-base font-black text-white transition-all hover:bg-gray-800 active:scale-[0.98] shadow-xl shadow-gray-900/20"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                  required 
                  type="password" 
                  placeholder="Enter at least 6 characters" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className={inputClass} 
                  minLength={6}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-black text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-emerald-600/20"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
              {isSubmitting ? "Updating..." : "Secure My Account"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}