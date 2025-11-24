import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger payloads for Server Actions (image uploads via WhatsApp media endpoint).
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
