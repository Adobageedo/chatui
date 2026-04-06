import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  serverExternalPackages: [
    "pdf-parse",
    "@napi-rs/canvas",
  ],
};

export default nextConfig;
