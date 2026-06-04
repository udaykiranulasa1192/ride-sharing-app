import DriverTopNav from "@/components/DriverTopNav";
import DriverNav from "@/components/DriverNav"; // <-- 1. Import the bottom nav

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative min-h-screen pb-20"> {/* Added pb-20 so content doesn't hide behind the bottom nav */}
      
      {/* The Top Bun (Never Reloads) */}
      <DriverTopNav />
      
      {/* The Meat (This is the only part that changes when you click a tab) */}
      <div className="pt-16">
        {children}
      </div>

      {/* The Bottom Bun (Never Reloads) */}
      <DriverNav /> 

    </section>
  );
}