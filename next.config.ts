import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // PWA Configuration
  webpack: (config, { isServer }) => {
    // Don't bundle service worker
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  
  // Enable static exports for better PWA caching
  images: {
    unoptimized: false,
  },
  
  // Headers for PWA
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
