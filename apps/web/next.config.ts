import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Product images are served from /media (proxied from the API); allow only those.
    localPatterns: [{ pathname: '/media/**', search: '' }],
  },
  experimental: {
    serverActions: {
      // Product images may be up to 5 MB; leave room for multipart overhead.
      bodySizeLimit: '6mb',
    },
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
