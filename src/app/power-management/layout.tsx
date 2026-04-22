import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute:
      "Fleet age & power management — Energy Vis",
  },
  description:
    "Capacity-weighted US generator age from EIA Form 860 — a public baseline for asset diligence, O&M, and capital markets context.",
  openGraph: {
    title: "Fleet age & power management — Energy Vis",
    description:
      "Public EIA-based view of how old the US power fleet is, by vintage bucket and fuel type.",
    type: "website",
  },
};

export default function PowerManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden">{children}</div>
  );
}
