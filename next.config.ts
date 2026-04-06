import type { NextConfig } from "next";
import { APP_CONFIG } from './config';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: APP_CONFIG.upload.maxFileSizeMB,
    },
  },
  allowedDevOrigins: ['easier-snappily-ansley.ngrok-free.dev'],
};

export default nextConfig;
