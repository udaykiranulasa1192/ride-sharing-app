import Navbar from "@/components/Navbar";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar will show on all driver pages */}
      <Navbar />
      
      {/* This is where your driver pages will render */}
      {children}
    </div>
  );
}