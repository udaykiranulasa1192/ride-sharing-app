import Link from "next/link";
import { Car, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md flex flex-col">
        
        {/* Header / Logo - Aligned Left */}
        <div className="flex items-center gap-2 mb-12 self-start">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 shadow-sm">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            ShiftPool
          </span>
        </div>

        {/* Hero Content */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
            Share the shift.<br />Split the cost.
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-xs mx-auto">
            Fast, reliable carpooling built for warehouse and shift workers. Get to work together.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-4">
          <Link
            href="/search"
            className="group w-full flex items-center justify-center gap-3 bg-emerald-600 text-white py-5 px-6 rounded-2xl text-lg font-semibold transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 shadow-md shadow-emerald-600/20"
          >
            <Users className="w-5 h-5" />
            Find Shift
          </Link>

          <Link
  href="/driver/login" // <-- CHANGED THIS
  className="group w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-5 px-6 rounded-2xl text-lg font-semibold border-2 border-gray-200 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
>
  <Car className="w-5 h-5 text-emerald-600" />
  Driver
</Link>
        </div>

        {/* Trust Indicator */}
        <p className="mt-10 text-center text-sm text-gray-500">
          Trusted by <span className="font-semibold text-gray-900">2,400+</span> shift workers
        </p>
      </div>
    </main>
  );
}