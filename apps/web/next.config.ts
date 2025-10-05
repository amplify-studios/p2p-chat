import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        if (entries['main-app'] && !entries['main-app'].includes('./why-did-you-render.js')) {
          entries['main-app'].unshift('./why-did-you-render.js');
        }
        return entries;
      };
    }

    return config;
  },
};

export default nextConfig;
