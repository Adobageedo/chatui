import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["easier-snappily-ansley.ngrok-free.dev"],
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
        // Skip ngrok browser warning page for all routes during dev
        source: "/:path*",
        headers: [
          {
            key: "ngrok-skip-browser-warning",
            value: "true",
          },
        ],
      },
      {
        // CORS headers for API routes (for Outlook add-in)
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Will be overridden by route-level CORS for better security
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, DELETE, PATCH, POST, PUT, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
      {
        // Allow Outlook to embed /outlook routes in an iframe
        source: "/outlook/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' http://localhost:8080 https://*.office.com https://*.office365.com https://*.outlook.com https://*.microsoft.com https://*.cloud.microsoft",
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
            value: "frame-ancestors 'self' http://localhost:8080 https://*.office.com https://*.office365.com https://*.outlook.com https://*.microsoft.com https://*.cloud.microsoft",
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
            value: "frame-ancestors 'self' http://localhost:8080 https://*.office.com https://*.office365.com https://*.outlook.com https://*.microsoft.com https://*.cloud.microsoft",
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
