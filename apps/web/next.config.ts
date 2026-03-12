import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.8', '192.168.1.6'],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
