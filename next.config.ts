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
  async headers() {
    return [
      {
        // Allow Outlook to embed /outlook routes in an iframe
        source: "/outlook/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.office.com https://*.office365.com https://*.outlook.com https://*.microsoft.com https://*.cloud.microsoft",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
        ],
      },
      {
        // Also allow the /outlook root route
        source: "/outlook",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.office.com https://*.office365.com https://*.outlook.com https://*.microsoft.com https://*.cloud.microsoft",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
        ],
      },
      {
        // Allow login page to be framed (for Outlook auth flow)
        source: "/login",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.office.com https://*.office365.com https://*.outlook.com https://*.microsoft.com https://*.cloud.microsoft",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
