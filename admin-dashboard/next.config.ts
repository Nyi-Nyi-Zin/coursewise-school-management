import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
