import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  experimental: {
    cpus: 1,
  },
};

export default withSerwist(nextConfig);
