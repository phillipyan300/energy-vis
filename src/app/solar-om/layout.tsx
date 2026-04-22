import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Solar O&M operator scatter — Energy Vis",
  },
  description:
    "3D operator portfolio scatter: why solar developers manage a fundamentally different O&M challenge than any other fuel type.",
  openGraph: {
    title: "Solar O&M operator scatter — Energy Vis",
    description:
      "EIA-based 3D scatter showing solar operators manage more sites, younger fleets, and wider geographies than any other fuel type.",
    type: "website",
  },
};

export default function SolarOMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-screen overflow-hidden">{children}</div>;
}
