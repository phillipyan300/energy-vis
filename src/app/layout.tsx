import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Power Map — Where AI Meets the Grid",
  description:
    "Interactive visualization of AI datacenter buildout and US electrical grid infrastructure. Explore the collision between AI compute demand and grid capacity.",
  openGraph: {
    title: "AI Power Map — Where AI Meets the Grid",
    description:
      "Interactive visualization of AI datacenter buildout and US electrical grid infrastructure.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
