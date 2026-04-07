import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "massive-cleanup-mirror-desirable.trycloudflare.com",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
