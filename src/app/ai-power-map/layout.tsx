import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "AI Power Map — Where AI Meets the Grid",
  },
  description:
    "Interactive visualization of AI datacenter buildout and US electrical grid infrastructure. Explore the collision between AI compute demand and grid capacity.",
  openGraph: {
    title: "AI Power Map — Where AI Meets the Grid",
    description:
      "Interactive visualization of AI datacenter buildout and US electrical grid infrastructure.",
    type: "website",
  },
};

export default function AIPowerMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden">{children}</div>
  );
}
