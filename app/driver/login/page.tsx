"use client";

import DriverAuthForm from "@/components/DriverAuthForm";
import { useRouter } from "next/navigation";

export default function DriverRegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* This pulls in the beautiful new component we just built! */}
      <DriverAuthForm onSuccess={() => router.push("/driver")} />
    </div>
  );
}