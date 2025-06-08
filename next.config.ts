import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "webisalespro-bucket.s3.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
