import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.8"
  ],
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
