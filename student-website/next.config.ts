import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  allowedDevOrigins: ["3001-iekc7i851k0ytf0nih1oy-91d8a135.us2.manus.computer"],
};

export default withSerwist(nextConfig);
