import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: path.join(__dirname, "..", "..", "..", ".."),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tjdbblgyyfmrxwduoyti.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pguhaepyzwmlrqctwybu.supabase.co",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
