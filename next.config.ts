import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
