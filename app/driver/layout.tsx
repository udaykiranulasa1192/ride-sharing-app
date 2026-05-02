import DriverNav from "@/components/DriverNav";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* The main content of the page goes here */}
      <div className="flex-1 pb-20">{children}</div>
      
      {/* The Bottom Navigation Component */}
      <DriverNav />
    </div>
  );
}