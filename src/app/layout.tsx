import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Energy Vis",
    template: "%s · Energy Vis",
  },
  description:
    "Interactive visualizations of US electrical infrastructure, the grid, and AI-related buildout.",
  openGraph: {
    title: "Energy Vis",
    description:
      "Interactive visualizations of US electrical infrastructure and the power grid.",
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
