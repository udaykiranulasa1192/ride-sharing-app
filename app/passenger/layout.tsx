import PassengerBottomNav from "@/components/PassengerBottomNav";

// The 'export default' is mandatory to fix your error!
export default function PassengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main>{children}</main>
      {/* This bottom nav only shows for passengers */}
      <PassengerBottomNav /> 
    </>
  );
}