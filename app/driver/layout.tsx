import DriverNav from "@/components/DriverNav";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main>{children}</main>
      {/* This bottom nav only shows for drivers */}
      <DriverNav />
    </>
  );
}