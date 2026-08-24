import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
