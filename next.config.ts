import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "webbysalespro-production.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "webisalespro-bucket.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "media.webbysalespro.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Stripe Elements does not support cross-origin isolated pages.
        // Keep IVS asset headers explicit, but avoid forcing COOP/COEP site-wide.
        source: "/ivs/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        // Ensure .wasm binary is served with the correct MIME type
        source: "/ivs/amazon-ivs-wasmworker.min.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
        ],
      },
      {
        // Allow the registration embed to be iframed from any origin.
        // All other routes inherit the browser default (no framing restriction),
        // but this makes the intent explicit and survives future security hardening.
        source: "/:id/register/embed",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
