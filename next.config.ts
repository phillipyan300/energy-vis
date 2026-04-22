import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // deck.gl's canvas/device lifecycle races with React 19 Strict Mode's
  // intentional double-mount in dev, surfacing as "Cannot read properties
  // of undefined (reading 'maxTextureDimension2D')". Disable strict mode
  // locally; prod builds are unaffected.
  reactStrictMode: false,
  transpilePackages: [
    "@deck.gl/core",
    "@deck.gl/layers",
    "@deck.gl/mapbox",
    "@deck.gl/react",
    "@deck.gl/geo-layers",
  ],
};

export default nextConfig;
