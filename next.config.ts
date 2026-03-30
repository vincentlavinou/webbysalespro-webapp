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
        // Required for IVS WASM worker inter-thread communication on Android Chrome 92+
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // Ensure .wasm binary is served with the correct MIME type
        source: "/ivs/:path*",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
        ],
      },
    ];
  },
};

export default nextConfig;
