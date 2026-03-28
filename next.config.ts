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
};

export default nextConfig;
