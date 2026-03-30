import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@deck.gl/core",
    "@deck.gl/layers",
    "@deck.gl/mapbox",
    "@deck.gl/react",
    "@deck.gl/geo-layers",
  ],
};

export default nextConfig;
