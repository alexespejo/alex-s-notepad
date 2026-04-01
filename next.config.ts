import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // BlockNote currently has issues with React 19 StrictMode in Next.
  reactStrictMode: false,
};

export default nextConfig;
